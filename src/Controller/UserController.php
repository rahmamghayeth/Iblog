<?php
declare(strict_types=1);

require_once __DIR__ . '/../Database/Database.php';
require_once __DIR__ . '/../Repository/UserRepository.php';
require_once __DIR__ . '/../Service/AuthService.php';
require_once __DIR__ . '/../Utils/Validator.php';

use IBlog\Repository\UserRepository;
use IBlog\Service\AuthService;

function userRepository(PDO $cnx): UserRepository
{
    static $instances = [];
    $key = spl_object_id($cnx);
    if (!isset($instances[$key])) {
        $instances[$key] = new UserRepository($cnx);
    }

    return $instances[$key];
}

function authService(PDO $cnx): AuthService
{
    static $instances = [];
    $key = spl_object_id($cnx);
    if (!isset($instances[$key])) {
        $instances[$key] = new AuthService(userRepository($cnx));
    }

    return $instances[$key];
}

function AddUser(PDO $cnx, array $data): bool
{
    return userRepository($cnx)->create($data);
}

function getAllUsers(PDO $cnx): array
{
    return userRepository($cnx)->findAll();
}

function searchUsers(PDO $cnx, string $search): array
{
    return userRepository($cnx)->search($search);
}

function ConnectUser(PDO $cnx, array $data): array|false
{
    return authService($cnx)->login((string) ($data['email'] ?? ''), (string) ($data['password'] ?? ''));
}

function getUserByEmail(PDO $cnx, string $email): array|false
{
    return userRepository($cnx)->findByEmail($email);
}

function getUserById(PDO $cnx, int $id): array|false
{
    return userRepository($cnx)->findById($id);
}

function updateUser(PDO $cnx, int $id, array $data): bool
{
    return userRepository($cnx)->update($id, $data);
}

function deleteUser(PDO $cnx, int $id): bool
{
    return userRepository($cnx)->delete($id);
}

function getUserFollowStats(PDO $cnx, int $userId): array
{
    return userRepository($cnx)->getFollowStats($userId);
}

function getFollowingUserIds(PDO $cnx, int $userId): array
{
    return userRepository($cnx)->getFollowingIds($userId);
}

function isUserFollowing(PDO $cnx, int $followerId, int $followedId): bool
{
    return userRepository($cnx)->isFollowing($followerId, $followedId);
}

function followUser(PDO $cnx, int $followerId, int $followedId): bool
{
    return userRepository($cnx)->followUser($followerId, $followedId);
}

function unfollowUser(PDO $cnx, int $followerId, int $followedId): bool
{
    return userRepository($cnx)->unfollowUser($followerId, $followedId);
}

function upgradeToPremium(PDO $cnx, int $userId, string $method = 'card', float $amount = 9.0): bool
{
    return authService($cnx)->upgradeToPremium($userId, $method, $amount);
}
