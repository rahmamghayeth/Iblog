<?php
declare(strict_types=1);

namespace IBlog\Repository;

use PDO;

final class CommunityRepository
{
    public function __construct(private readonly PDO $connection)
    {
    }

    public function create(array $data): int|false
    {
        $stmt = $this->connection->prepare(
            'INSERT INTO community (creatorId, name, description, icon, topics, memberCount, createdAt)
             VALUES (:creatorId, :name, :description, :icon, :topics, 1, CURRENT_TIMESTAMP)'
        );
        $ok = $stmt->execute([
            ':creatorId' => (int) ($data['creatorId'] ?? 0),
            ':name' => (string) ($data['name'] ?? ''),
            ':description' => (string) ($data['description'] ?? ''),
            ':icon' => (string) ($data['icon'] ?? ''),
            ':topics' => $data['topics'] ?? null,
        ]);

        return $ok ? (int) $this->connection->lastInsertId() : false;
    }

    public function addCreatorMembership(int $communityId, int $userId): void
    {
        $stmt = $this->connection->prepare(
            "INSERT INTO communitymember (communityId, userId, role, joinedAt)
             VALUES (:communityId, :userId, 'creator', CURRENT_TIMESTAMP)"
        );
        $stmt->execute([
            ':communityId' => $communityId,
            ':userId' => $userId,
        ]);
    }

    public function findAll(): array
    {
        $stmt = $this->connection->query(
            'SELECT c.*, u.name AS creator_name
             FROM community c
             LEFT JOIN users u ON u.id = c.creatorId
             ORDER BY c.createdAt DESC'
        );

        return array_map([$this, 'mapCommunity'], $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->connection->prepare(
            'SELECT c.*, u.name AS creator_name
             FROM community c
             LEFT JOIN users u ON u.id = c.creatorId
             WHERE c.id = :id
             LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $this->mapCommunity($row) : null;
    }

    public function findByUser(int $userId): array
    {
        $stmt = $this->connection->prepare(
            'SELECT c.id, c.name, c.icon, c.memberCount
             FROM community c
             INNER JOIN communitymember cm ON cm.communityId = c.id
             WHERE cm.userId = :userId AND cm.isBanned = 0
             ORDER BY c.name'
        );
        $stmt->execute([':userId' => $userId]);

        return array_map(static function (array $row): array {
            return [
                'id' => (int) ($row['id'] ?? 0),
                'name' => (string) ($row['name'] ?? ''),
                'iconLetter' => (string) (($row['icon'] ?? '') ?: strtoupper(substr((string) ($row['name'] ?? ''), 0, 2))),
                'memberCount' => (int) ($row['memberCount'] ?? 0),
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
    }

    public function join(int $userId, int $communityId): array
    {
        $chk = $this->connection->prepare(
            'SELECT id FROM communitymember WHERE communityId = :communityId AND userId = :userId'
        );
        $chk->execute([
            ':communityId' => $communityId,
            ':userId' => $userId,
        ]);

        if ($chk->fetch()) {
            return ['success' => true, 'alreadyMember' => true];
        }

        $stmt = $this->connection->prepare(
            "INSERT INTO communitymember (communityId, userId, role, joinedAt)
             VALUES (:communityId, :userId, 'member', CURRENT_TIMESTAMP)"
        );
        $ok = $stmt->execute([
            ':communityId' => $communityId,
            ':userId' => $userId,
        ]);

        if ($ok) {
            $this->connection->prepare(
                'UPDATE community SET memberCount = memberCount + 1 WHERE id = :id'
            )->execute([':id' => $communityId]);
        }

        return ['success' => $ok, 'alreadyMember' => false];
    }

    public function leave(int $userId, int $communityId): bool
    {
        $stmt = $this->connection->prepare(
            'DELETE FROM communitymember WHERE communityId = :communityId AND userId = :userId'
        );
        $ok = $stmt->execute([
            ':communityId' => $communityId,
            ':userId' => $userId,
        ]);

        if ($ok && $stmt->rowCount() > 0) {
            $this->connection->prepare(
                'UPDATE community
                 SET memberCount = CASE WHEN memberCount > 0 THEN memberCount - 1 ELSE 0 END
                 WHERE id = :id'
            )->execute([':id' => $communityId]);
        }

        return $ok;
    }

    public function isMember(int $communityId, int $userId): bool
    {
        $stmt = $this->connection->prepare(
            'SELECT id
             FROM communitymember
             WHERE communityId = :communityId
               AND userId = :userId
               AND isBanned = 0
             LIMIT 1'
        );
        $stmt->execute([
            ':communityId' => $communityId,
            ':userId' => $userId,
        ]);

        return (bool) $stmt->fetchColumn();
    }

    public function checkMembership(int $communityId, int $userId): array
    {
        $stmt = $this->connection->prepare(
            'SELECT isBanned
             FROM communitymember
             WHERE communityId = :communityId
               AND userId = :userId'
        );
        $stmt->execute([
            ':communityId' => $communityId,
            ':userId' => $userId,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row)) {
            return ['isMember' => false, 'isBanned' => false];
        }

        return [
            'isMember' => true,
            'isBanned' => (bool) ($row['isBanned'] ?? false),
        ];
    }

    public function isUserPremium(int $userId): bool
    {
        $stmt = $this->connection->prepare(
            "SELECT COALESCE(isPremium, 0) AS isPremium, COALESCE(plan, 'free') AS plan
             FROM users
             WHERE id = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row)) {
            return false;
        }

        return (int) ($row['isPremium'] ?? 0) === 1 || strtolower((string) ($row['plan'] ?? 'free')) === 'premium';
    }

    public function findUserName(int $userId): string
    {
        $stmt = $this->connection->prepare('SELECT name FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $name = $stmt->fetchColumn();

        return is_string($name) && trim($name) !== '' ? trim($name) : 'Member';
    }

    public function findMessages(int $communityId): array
    {
        $this->ensureMessageTable();

        $stmt = $this->connection->prepare(
            'SELECT cm.id, cm.userId, cm.message, cm.createdAt, u.name AS userName
             FROM community_message cm
             LEFT JOIN users u ON u.id = cm.userId
             WHERE cm.communityId = :communityId
               AND cm.isDeleted = 0
             ORDER BY cm.createdAt ASC
             LIMIT 200'
        );
        $stmt->execute([':communityId' => $communityId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function createMessage(int $communityId, int $userId, string $message): int|false
    {
        $this->ensureMessageTable();

        $stmt = $this->connection->prepare(
            'INSERT INTO community_message (communityId, userId, message, isDeleted, createdAt)
             VALUES (:communityId, :userId, :message, 0, CURRENT_TIMESTAMP)'
        );
        $ok = $stmt->execute([
            ':communityId' => $communityId,
            ':userId' => $userId,
            ':message' => $message,
        ]);

        return $ok ? (int) $this->connection->lastInsertId() : false;
    }

    public function ensureMessageTable(): void
    {
        $this->connection->exec(
            'CREATE TABLE IF NOT EXISTS community_message (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                communityId INT UNSIGNED NOT NULL,
                userId INT UNSIGNED NOT NULL,
                message TEXT NOT NULL,
                isDeleted TINYINT(1) NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_community_message (communityId, createdAt),
                INDEX idx_community_message_user (userId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
    }

    public function ensureThreadTables(): void
    {
        $this->connection->exec(
            'CREATE TABLE IF NOT EXISTS community_thread (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                communityId INT UNSIGNED NOT NULL,
                creatorId INT UNSIGNED NOT NULL,
                title VARCHAR(180) NOT NULL,
                isDeleted TINYINT(1) NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_ct_community (communityId),
                INDEX idx_ct_creator (creatorId),
                INDEX idx_ct_created (createdAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
        $this->connection->exec(
            'CREATE TABLE IF NOT EXISTS community_thread_message (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                communityId INT UNSIGNED NOT NULL,
                threadId INT UNSIGNED NOT NULL,
                userId INT UNSIGNED NOT NULL,
                message TEXT NOT NULL,
                isDeleted TINYINT(1) NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ctm_thread (threadId),
                INDEX idx_ctm_community (communityId),
                INDEX idx_ctm_user (userId),
                INDEX idx_ctm_created (createdAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
    }

    public function findThreads(int $communityId): array
    {
        $this->ensureThreadTables();

        $stmt = $this->connection->prepare(
            'SELECT t.id, t.communityId, t.creatorId, t.title, t.createdAt,
                    COALESCE(u.name, "Member") AS creatorName,
                    (
                        SELECT COUNT(*)
                        FROM community_thread_message tm
                        WHERE tm.threadId = t.id AND tm.isDeleted = 0
                    ) AS replyCount
             FROM community_thread t
             LEFT JOIN users u ON u.id = t.creatorId
             WHERE t.communityId = :communityId
               AND t.isDeleted = 0
             ORDER BY t.createdAt DESC
             LIMIT 200'
        );
        $stmt->execute([':communityId' => $communityId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function createThread(int $communityId, int $userId, string $title): int|false
    {
        $this->ensureThreadTables();

        $stmt = $this->connection->prepare(
            'INSERT INTO community_thread (communityId, creatorId, title, isDeleted, createdAt, updatedAt)
             VALUES (:communityId, :creatorId, :title, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
        );
        $ok = $stmt->execute([
            ':communityId' => $communityId,
            ':creatorId' => $userId,
            ':title' => $title,
        ]);

        return $ok ? (int) $this->connection->lastInsertId() : false;
    }

    public function deleteThread(int $communityId, int $threadId): bool
    {
        $this->ensureThreadTables();

        $stmt = $this->connection->prepare(
            'UPDATE community_thread
             SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP
             WHERE id = :threadId AND communityId = :communityId'
        );
        $stmt->execute([
            ':threadId' => $threadId,
            ':communityId' => $communityId,
        ]);

        $msgStmt = $this->connection->prepare(
            'UPDATE community_thread_message
             SET isDeleted = 1
             WHERE threadId = :threadId'
        );
        $msgStmt->execute([':threadId' => $threadId]);

        return true;
    }

    public function threadExists(int $communityId, int $threadId): bool
    {
        $this->ensureThreadTables();

        $stmt = $this->connection->prepare(
            'SELECT id
             FROM community_thread
             WHERE id = :threadId
               AND communityId = :communityId
               AND isDeleted = 0
             LIMIT 1'
        );
        $stmt->execute([
            ':threadId' => $threadId,
            ':communityId' => $communityId,
        ]);

        return (bool) $stmt->fetchColumn();
    }

    public function findThreadMessages(int $communityId, int $threadId): array
    {
        $this->ensureThreadTables();

        $stmt = $this->connection->prepare(
            'SELECT tm.id, tm.threadId, tm.userId, tm.message, tm.createdAt,
                    COALESCE(u.name, "Member") AS userName
             FROM community_thread_message tm
             LEFT JOIN users u ON u.id = tm.userId
             INNER JOIN community_thread t ON t.id = tm.threadId AND t.isDeleted = 0
             WHERE tm.threadId = :threadId
               AND tm.communityId = :communityId
               AND tm.isDeleted = 0
             ORDER BY tm.createdAt ASC
             LIMIT 500'
        );
        $stmt->execute([
            ':threadId' => $threadId,
            ':communityId' => $communityId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function createThreadMessage(int $communityId, int $threadId, int $userId, string $message): int|false
    {
        $this->ensureThreadTables();

        $stmt = $this->connection->prepare(
            'INSERT INTO community_thread_message (communityId, threadId, userId, message, isDeleted, createdAt)
             VALUES (:communityId, :threadId, :userId, :message, 0, CURRENT_TIMESTAMP)'
        );
        $ok = $stmt->execute([
            ':communityId' => $communityId,
            ':threadId' => $threadId,
            ':userId' => $userId,
            ':message' => $message,
        ]);

        return $ok ? (int) $this->connection->lastInsertId() : false;
    }

    private function mapCommunity(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'name' => (string) ($row['name'] ?? ''),
            'description' => (string) ($row['description'] ?? ''),
            'iconLetter' => (string) (($row['icon'] ?? '') ?: strtoupper(substr((string) ($row['name'] ?? ''), 0, 2))),
            'memberCount' => (int) ($row['memberCount'] ?? 0),
            'creatorName' => $row['creator_name'] ?? null,
            'tags' => !empty($row['topics']) ? array_map('trim', explode(',', (string) $row['topics'])) : [],
        ];
    }
}
