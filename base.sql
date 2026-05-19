CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    plan VARCHAR(32) NOT NULL DEFAULT 'free',
    isPremium TINYINT(1) NOT NULL DEFAULT 0,
    isAdmin TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    bio TEXT NULL,
    avatar VARCHAR(255) NULL,
    cover VARCHAR(255) NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_follow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    followerId INT NOT NULL,
    followedId INT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_follow (followerId, followedId),
    INDEX idx_user_follow_follower (followerId),
    INDEX idx_user_follow_followed (followedId)
);

CREATE TABLE article (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body LONGTEXT NOT NULL,
    category VARCHAR(120) DEFAULT 'General',
    tags TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    coverImage VARCHAR(255) NULL,
    readingTime VARCHAR(32) DEFAULT '1 min',
    likesCount INT NOT NULL DEFAULT 0,
    views INT NOT NULL DEFAULT 0,
    label VARCHAR(64) NOT NULL DEFAULT 'none',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_article_user (userId),
    INDEX idx_article_status (status)
);

CREATE TABLE savedarticle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    articleId INT NOT NULL,
    savedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_saved_article (userId, articleId)
);

CREATE TABLE comment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    articleId INT NOT NULL,
    userId INT NOT NULL,
    body TEXT NOT NULL,
    parentId INT NULL,
    likesCount INT NOT NULL DEFAULT 0,
    isFlagged TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comment_article (articleId)
);

CREATE TABLE community (
    id INT AUTO_INCREMENT PRIMARY KEY,
    creatorId INT NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(8) NOT NULL,
    topics TEXT NULL,
    memberCount INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE communitymember (
    id INT AUTO_INCREMENT PRIMARY KEY,
    communityId INT NOT NULL,
    userId INT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'member',
    joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isBanned TINYINT(1) NOT NULL DEFAULT 0,
    notificationsOn TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uniq_community_member (communityId, userId)
);

CREATE TABLE community_message (
    id INT AUTO_INCREMENT PRIMARY KEY,
    communityId INT NOT NULL,
    userId INT NOT NULL,
    message TEXT NOT NULL,
    isDeleted TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_community_message (communityId, createdAt)
);

CREATE TABLE subscription (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    plan VARCHAR(32) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'TND',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    method VARCHAR(32) NOT NULL DEFAULT 'card',
    promoCode VARCHAR(120) NULL,
    startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME NULL
);

CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_resets_email (email)
);

CREATE TABLE article_like (
    id INT AUTO_INCREMENT PRIMARY KEY,
    articleId INT NOT NULL,
    userId INT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_article_like (articleId, userId)
);

CREATE TABLE community_thread (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    communityId INT UNSIGNED NOT NULL,
    creatorId INT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    isDeleted TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ct_community (communityId),
    INDEX idx_ct_creator (creatorId),
    INDEX idx_ct_created (createdAt)
);

CREATE TABLE community_thread_message (
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
);
