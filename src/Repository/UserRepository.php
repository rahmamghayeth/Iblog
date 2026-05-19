<?php
declare(strict_types=1);

namespace IBlog\Repository;

use PDO;
use PDOException;

final class UserRepository
{
    public function __construct(private readonly PDO $connection)
    {
    }

    private function ensureUserFollowTable(): void
    {
        $this->connection->exec(
            "CREATE TABLE IF NOT EXISTS user_follow (
                id INT AUTO_INCREMENT PRIMARY KEY,
                followerId INT NOT NULL,
                followedId INT NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_user_follow (followerId, followedId),
                INDEX idx_user_follow_follower (followerId),
                INDEX idx_user_follow_followed (followedId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    public function create(array $data): bool
    {
        $hash = password_hash((string) ($data['password'] ?? ''), PASSWORD_DEFAULT);
        $stmt = $this->connection->prepare(
            'INSERT INTO users (name, email, password, plan, isPremium, isAdmin)
             VALUES (:name, :email, :password, :plan, :isPremium, :isAdmin)'
        );

        return $stmt->execute([
            ':name' => (string) ($data['name'] ?? ''),
            ':email' => (string) ($data['email'] ?? ''),
            ':password' => $hash,
            ':plan' => (string) ($data['plan'] ?? 'free'),
            ':isPremium' => (int) ($data['isPremium'] ?? 0),
            ':isAdmin' => (int) ($data['isAdmin'] ?? 0),
        ]);
    }

    public function findAll(): array
    {
        $stmt = $this->connection->query(
            "SELECT id, name, email, password, plan,
                    COALESCE(isPremium, 0) AS isPremium,
                    COALESCE(isAdmin, 0) AS isAdmin,
                    COALESCE(status, 'active') AS status,
                    createdAt
             FROM users
             ORDER BY id DESC"
        );

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function search(string $search): array
    {
        $stmt = $this->connection->prepare(
            "SELECT id, name, email, password, plan,
                    COALESCE(isPremium, 0) AS isPremium,
                    COALESCE(isAdmin, 0) AS isAdmin,
                    COALESCE(status, 'active') AS status,
                    createdAt
             FROM users
             WHERE name LIKE :searchName OR email LIKE :searchEmail
             ORDER BY id DESC"
        );
        $like = '%' . $search . '%';
        $stmt->execute([
            ':searchName' => $like,
            ':searchEmail' => $like,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function authenticate(string $email, string $password): array|false
    {
        $user = $this->findByEmail($email);
        if ($user === false) {
            return false;
        }

        return password_verify($password, (string) $user['password']) ? $user : false;
    }

    public function findByEmail(string $email): array|false
    {
        $stmt = $this->connection->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: false;
    }

    public function findById(int $id): array|false
    {
        $stmt = $this->connection->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: false;
    }

    public function update(int $id, array $data): bool
    {
        $current = $this->findById($id);
        if ($current === false) {
            return false;
        }

        $password = trim((string) ($data['password'] ?? ''));
        $hash = $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : (string) ($current['password'] ?? '');

        $stmt = $this->connection->prepare(
            'UPDATE users
             SET name = :name,
                 email = :email,
                 password = :password,
                 plan = :plan,
                 isPremium = :isPremium,
                 isAdmin = :isAdmin
             WHERE id = :id'
        );

        return $stmt->execute([
            ':id' => $id,
            ':name' => (string) ($data['name'] ?? $current['name'] ?? ''),
            ':email' => (string) ($data['email'] ?? $current['email'] ?? ''),
            ':password' => $hash,
            ':plan' => (string) ($data['plan'] ?? $current['plan'] ?? 'free'),
            ':isPremium' => (int) ($data['isPremium'] ?? $current['isPremium'] ?? 0),
            ':isAdmin' => (int) ($data['isAdmin'] ?? $current['isAdmin'] ?? 0),
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->connection->prepare('DELETE FROM users WHERE id = :id');
        return $stmt->execute([':id' => $id]);
    }

    public function getFollowStats(int $userId): array
    {
        if ($userId <= 0) {
            return ['followers' => 0, 'following' => 0];
        }

        $this->ensureUserFollowTable();

        $followersStmt = $this->connection->prepare(
            'SELECT COUNT(*) FROM user_follow WHERE followedId = :userId'
        );
        $followersStmt->execute([':userId' => $userId]);

        $followingStmt = $this->connection->prepare(
            'SELECT COUNT(*) FROM user_follow WHERE followerId = :userId'
        );
        $followingStmt->execute([':userId' => $userId]);

        return [
            'followers' => (int) $followersStmt->fetchColumn(),
            'following' => (int) $followingStmt->fetchColumn(),
        ];
    }

    public function getFollowingIds(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        $this->ensureUserFollowTable();

        $stmt = $this->connection->prepare(
            'SELECT followedId FROM user_follow WHERE followerId = :userId ORDER BY followedId ASC'
        );
        $stmt->execute([':userId' => $userId]);

        return array_map(
            static fn (mixed $value): int => (int) $value,
            $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []
        );
    }

    public function isFollowing(int $followerId, int $followedId): bool
    {
        if ($followerId <= 0 || $followedId <= 0 || $followerId === $followedId) {
            return false;
        }

        $this->ensureUserFollowTable();

        $stmt = $this->connection->prepare(
            'SELECT 1 FROM user_follow WHERE followerId = :followerId AND followedId = :followedId LIMIT 1'
        );
        $stmt->execute([
            ':followerId' => $followerId,
            ':followedId' => $followedId,
        ]);

        return (bool) $stmt->fetchColumn();
    }

    public function followUser(int $followerId, int $followedId): bool
    {
        if ($followerId <= 0 || $followedId <= 0 || $followerId === $followedId) {
            return false;
        }

        if ($this->findById($followerId) === false || $this->findById($followedId) === false) {
            return false;
        }

        $this->ensureUserFollowTable();

        $stmt = $this->connection->prepare(
            'INSERT IGNORE INTO user_follow (followerId, followedId, createdAt)
             VALUES (:followerId, :followedId, CURRENT_TIMESTAMP)'
        );
        $stmt->execute([
            ':followerId' => $followerId,
            ':followedId' => $followedId,
        ]);

        return $stmt->rowCount() > 0 || $this->isFollowing($followerId, $followedId);
    }

    public function unfollowUser(int $followerId, int $followedId): bool
    {
        if ($followerId <= 0 || $followedId <= 0 || $followerId === $followedId) {
            return false;
        }

        $this->ensureUserFollowTable();

        $stmt = $this->connection->prepare(
            'DELETE FROM user_follow WHERE followerId = :followerId AND followedId = :followedId'
        );
        $stmt->execute([
            ':followerId' => $followerId,
            ':followedId' => $followedId,
        ]);

        return true;
    }

    public function upgradeToPremium(int $userId, string $method = 'card', float $amount = 9.0): bool
    {
        $stmt = $this->connection->prepare(
            "UPDATE users SET isPremium = 1, plan = 'premium' WHERE id = :id"
        );
        $stmt->execute([':id' => $userId]);

        try {
            $subscription = $this->connection->prepare(
                "INSERT INTO subscription
                    (userId, plan, amount, currency, status, method, startedAt, expiresAt)
                 VALUES
                    (:userId, 'premium', :amount, 'TND', 'active', :method, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 MONTH))"
            );
            $subscription->execute([
                ':userId' => $userId,
                ':amount' => $amount,
                ':method' => $method,
            ]);
        } catch (PDOException) {
        }

        return true;
    }
}
