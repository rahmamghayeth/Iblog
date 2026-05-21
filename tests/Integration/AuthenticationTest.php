<?php
declare(strict_types=1);

namespace IBlog\Tests\Integration;

use IBlog\Tests\Support\EndpointTestCase;

final class AuthenticationTest extends EndpointTestCase
{
    public function testGuestCannotFetchAuthenticatedProfile(): void
    {
        $response = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'me',
        ]);

        $this->assertSame(401, $response->status);
        $this->assertSame('Not authenticated.', $response->json()['error'] ?? null);
    }

    public function testGeneratedAdminCredentialsCanSignInViaApi(): void
    {
        $response = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'signin',
            'email' => 'admin@iblog.com',
            'password' => 'Admin2026!',
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();
        $this->assertTrue($json['ok'] ?? false);
        $this->assertSame('backend/view/components/admin/admin.php', $json['redirect'] ?? null);

        $created = $this->db()->query("SELECT email, isAdmin, isPremium, plan FROM users WHERE email = 'admin@iblog.com'")->fetch();
        $this->assertSame('admin@iblog.com', $created['email'] ?? null);
        $this->assertSame(1, (int) ($created['isAdmin'] ?? 0));
        $this->assertSame(1, (int) ($created['isPremium'] ?? 0));
        $this->assertSame('premium', $created['plan'] ?? null);
    }

    public function testGeneratedAdminCredentialsCanSignInViaLegacyAuthForm(): void
    {
        $response = $this->client->postForm('/backend/view/components/auth/auth.php?mode=signin', [
            'action' => 'signin',
            'email' => 'admin@iblog.com',
            'password' => 'Admin2026!',
        ]);

        $this->assertSame(302, $response->status, $response->body);

        $adminPage = $this->client->get('/backend/view/components/admin/admin.php');
        $this->assertSame(200, $adminPage->status, $adminPage->body);
        $this->assertStringContainsString('Admin dashboard', $adminPage->body);

        $created = $this->db()->query("SELECT email, isAdmin, isPremium, plan FROM users WHERE email = 'admin@iblog.com'")->fetch();
        $this->assertSame('admin@iblog.com', $created['email'] ?? null);
        $this->assertSame(1, (int) ($created['isAdmin'] ?? 0));
        $this->assertSame(1, (int) ($created['isPremium'] ?? 0));
        $this->assertSame('premium', $created['plan'] ?? null);
    }

    public function testForgotPasswordAcceptsExistingAccount(): void
    {
        $response = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'forgot_password',
            'email' => 'free@example.com',
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();
        $this->assertTrue($json['ok'] ?? false);
        $this->assertSame('free@example.com', $json['email'] ?? null);

        $count = (int) $this->db()->query("SELECT COUNT(*) FROM password_resets WHERE email = 'free@example.com'")->fetchColumn();
        $this->assertSame(1, $count);
    }

    public function testResetPasswordSucceedsWithValidToken(): void
    {
        $token = 'known-reset-token';
        $hash = hash('sha256', $token);
        $this->db()->exec(
            "CREATE TABLE IF NOT EXISTS password_resets (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(190) NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_password_resets_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        $stmt = $this->db()->prepare('INSERT INTO password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)');
        $stmt->execute(['free@example.com', $hash, '2030-01-01 00:00:00']);

        $response = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'reset_password',
            'email' => 'free@example.com',
            'token' => $token,
            'password' => 'UpdatedPass1!',
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $this->assertTrue($response->json()['ok'] ?? false);
        $passwordHash = $this->db()->query("SELECT password FROM users WHERE email = 'free@example.com'")->fetchColumn();
        $this->assertIsString($passwordHash);
        $this->assertTrue(password_verify('UpdatedPass1!', $passwordHash));
    }

    public function testResetPasswordRejectsExpiredToken(): void
    {
        $token = 'expired-reset-token';
        $hash = hash('sha256', $token);
        $this->db()->exec(
            "CREATE TABLE IF NOT EXISTS password_resets (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(190) NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_password_resets_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        $stmt = $this->db()->prepare('INSERT INTO password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)');
        $stmt->execute(['free@example.com', $hash, '2020-01-01 00:00:00']);

        $response = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'reset_password',
            'email' => 'free@example.com',
            'token' => $token,
            'password' => 'UpdatedPass1!',
        ]);

        $this->assertSame(410, $response->status);
        $this->assertSame('This reset link is invalid or has expired.', $response->json()['error'] ?? null);
    }

    public function testUpgradeToPremiumChangesPlanAndCreatesSubscription(): void
    {
        $this->signIn('free@example.com');

        $response = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'upgrade_to_premium',
            'method' => 'card',
            'amount' => 9,
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();
        $this->assertTrue($json['ok'] ?? false);
        $this->assertSame('premium', $json['user']['plan'] ?? null);
        $this->assertTrue((bool) ($json['user']['isPremium'] ?? false));

        $subscriptionCount = (int) $this->db()->query('SELECT COUNT(*) FROM subscription WHERE userId = 2')->fetchColumn();
        $this->assertGreaterThanOrEqual(1, $subscriptionCount);
    }

    public function testAuthenticatedUserCanFollowAndUnfollowAnotherUser(): void
    {
        $this->signIn('free@example.com');

        $follow = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'follow_user',
            'targetUserId' => 4,
        ]);

        $this->assertSame(200, $follow->status, $follow->body);
        $followJson = $follow->json();
        $this->assertTrue($followJson['ok'] ?? false);
        $this->assertSame(1, $followJson['viewer']['following'] ?? null);
        $this->assertSame([4], $followJson['viewer']['followingIds'] ?? null);
        $this->assertSame(1, $followJson['target']['followers'] ?? null);
        $this->assertTrue((bool) ($followJson['target']['isFollowing'] ?? false));

        $stored = (int) $this->db()->query('SELECT COUNT(*) FROM user_follow WHERE followerId = 2 AND followedId = 4')->fetchColumn();
        $this->assertSame(1, $stored);

        $me = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'me',
        ]);
        $this->assertSame(200, $me->status, $me->body);
        $this->assertSame([4], $me->json()['user']['followingIds'] ?? null);

        $unfollow = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'unfollow_user',
            'targetUserId' => 4,
        ]);

        $this->assertSame(200, $unfollow->status, $unfollow->body);
        $unfollowJson = $unfollow->json();
        $this->assertTrue($unfollowJson['ok'] ?? false);
        $this->assertSame(0, $unfollowJson['viewer']['following'] ?? null);
        $this->assertSame([], $unfollowJson['viewer']['followingIds'] ?? null);
        $this->assertSame(0, $unfollowJson['target']['followers'] ?? null);
        $this->assertFalse((bool) ($unfollowJson['target']['isFollowing'] ?? true));

        $remaining = (int) $this->db()->query('SELECT COUNT(*) FROM user_follow WHERE followerId = 2 AND followedId = 4')->fetchColumn();
        $this->assertSame(0, $remaining);
    }

    public function testListUsersAndTopAuthorsExposeFollowState(): void
    {
        $this->signIn('free@example.com');

        $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'follow_user',
            'targetUserId' => 4,
        ]);

        $directory = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'list_users',
            'q' => 'Other',
        ]);

        $this->assertSame(200, $directory->status, $directory->body);
        $users = $directory->json()['users'] ?? [];
        $other = $users[0] ?? null;
        $this->assertSame(4, $other['id'] ?? null);
        $this->assertSame(1, $other['followers'] ?? null);
        $this->assertTrue((bool) ($other['isFollowing'] ?? false));

        $authors = $this->client->postJson('/backend/view/components/auth/api-stats.php', [
            'action' => 'top_authors',
        ]);

        $this->assertSame(200, $authors->status, $authors->body);
        $rows = $authors->json()['authors'] ?? [];
        $target = null;
        foreach ($rows as $row) {
            if ((int) ($row['id'] ?? 0) === 4) {
                $target = $row;
                break;
            }
        }

        $this->assertIsArray($target);
        $this->assertSame(1, $target['followers'] ?? null);
        $this->assertTrue((bool) ($target['isFollowing'] ?? false));
    }
}
