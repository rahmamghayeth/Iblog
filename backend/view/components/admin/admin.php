<?php
declare(strict_types=1);
session_start();

if (!isset($_SESSION['isAdmin']) || (int) $_SESSION['isAdmin'] !== 1) {
    header('Location: admin-login.php');
    exit();
}

$_SESSION['adminLoggedIn'] = true;

$adminName = htmlspecialchars((string) ($_SESSION['name'] ?? 'Admin'), ENT_QUOTES, 'UTF-8');
$assetVersion = (string) max(
    (int) (@filemtime(__DIR__ . '/admin.css') ?: time()),
    (int) (@filemtime(__DIR__ . '/admin.js') ?: time())
);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IBlog Admin Dashboard</title>
  <link rel="stylesheet" href="admin.css?v=<?= urlencode($assetVersion) ?>">
</head>
<body>
  <aside class="admin-sidebar">
    <div class="admin-logo">
      <div class="admin-logo-text">IBlog <span class="admin-logo-badge">Admin</span></div>
    </div>

    <nav class="admin-nav">
      <div class="admin-nav-label">Workspace</div>
      <button class="admin-nav-item active" type="button" onclick="IBlogAdmin.navigate('overview', this)">
        <span class="nav-icon">Overview</span>
      </button>
      <button class="admin-nav-item" type="button" onclick="IBlogAdmin.navigate('users', this)">
        <span class="nav-icon">Users</span>
        <span class="admin-nav-count" id="users-badge">0</span>
      </button>
      <button class="admin-nav-item" type="button" onclick="IBlogAdmin.navigate('articles', this)">
        <span class="nav-icon">Articles</span>
        <span class="admin-nav-count" id="articles-badge">0</span>
      </button>
      <button class="admin-nav-item" type="button" onclick="IBlogAdmin.navigate('revenue', this)">
        <span class="nav-icon">Revenue</span>
      </button>

      <div class="admin-nav-label">Shortcuts</div>
      <a class="admin-nav-link" href="../../../../index.php">Open website</a>
      <a class="admin-nav-link" href="../auth/logout.php">Logout</a>
    </nav>

    <div class="admin-sidebar-footer">
      <div class="footer-name"><?= $adminName ?></div>
      <div class="footer-role">Administrator session</div>
      <a href="admin-login.php">Back to login</a>
    </div>
  </aside>

  <main class="admin-main">
    <div class="admin-topbar">
      <div>
        <h1>Admin dashboard</h1>
        <p>Moderate members, shape the feed, and track premium activity in one place.</p>
      </div>
      <div class="admin-topbar-side">
        <div class="admin-time-pill" id="admin-time"></div>
      </div>
    </div>

    <div id="admin-dashboard">
      <section class="admin-view active" id="view-overview">
        <div class="admin-stats">
          <article class="stat-card">
            <div class="stat-label">Members</div>
            <div class="stat-value" id="stat-users">-</div>
          </article>
          <article class="stat-card">
            <div class="stat-label">Articles</div>
            <div class="stat-value" id="stat-articles">-</div>
          </article>
          <article class="stat-card premium">
            <div class="stat-label">Active premium</div>
            <div class="stat-value" id="stat-premium">-</div>
          </article>
          <article class="stat-card revenue">
            <div class="stat-label">Monthly revenue</div>
            <div class="stat-value" id="stat-revenue">-</div>
          </article>
        </div>

        <div class="admin-overview-grid">
          <section class="section-card">
            <div class="section-head">
              <div>
                <h2>Member growth</h2>
                <p>Weekly trend based on account creation.</p>
              </div>
            </div>
            <div class="admin-chart" id="chart-users"></div>
          </section>

          <section class="section-card">
            <div class="section-head">
              <div>
                <h2>Revenue pulse</h2>
                <p>Estimated momentum from active premium subscriptions.</p>
              </div>
            </div>
            <div class="admin-chart" id="chart-revenue"></div>
          </section>
        </div>

        <section class="section-card">
          <div class="section-head">
            <div>
              <h2>Recent activity</h2>
              <p>Latest signups and publishing actions.</p>
            </div>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Subject</th>
                  <th>When</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="activity-log"></tbody>
            </table>
          </div>
        </section>
      </section>

      <section class="admin-view" id="view-users">
        <div class="admin-view-head">
          <div>
            <h2>Users</h2>
            <p>Edit, ban, or remove community members.</p>
          </div>
          <button class="admin-btn admin-btn-primary" type="button" onclick="IBlogAdmin.openCreateUser()">New user</button>
        </div>

        <section class="section-card">
          <div class="admin-toolbar">
            <div class="search-bar">
              <input id="user-search" type="search" placeholder="Search users by name or email" oninput="IBlogAdmin.filterUsers(this.value)">
            </div>
            <div class="admin-filter-row">
              <button class="admin-filter-chip active" type="button" onclick="IBlogAdmin.filterUsersByPlan(this, 'all')">All</button>
              <button class="admin-filter-chip" type="button" onclick="IBlogAdmin.filterUsersByPlan(this, 'premium')">Premium</button>
              <button class="admin-filter-chip" type="button" onclick="IBlogAdmin.filterUsersByPlan(this, 'free')">Free</button>
              <button class="admin-filter-chip" type="button" onclick="IBlogAdmin.filterUsersByPlan(this, 'banned')">Banned</button>
            </div>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Articles</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="users-table"></tbody>
            </table>
          </div>
        </section>
      </section>

      <section class="admin-view" id="view-articles">
        <div class="admin-view-head">
          <div>
            <h2>Articles</h2>
            <p>Adjust categories or delete articles directly from the dashboard.</p>
          </div>
        </div>

        <section class="section-card">
          <div class="admin-toolbar">
            <div class="search-bar">
              <input id="article-search" type="search" placeholder="Search articles by title or author" oninput="IBlogAdmin.filterArticles(this.value)">
            </div>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Views</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="articles-table"></tbody>
            </table>
          </div>
        </section>
      </section>

      <section class="admin-view" id="view-revenue">
        <div class="admin-view-head">
          <div>
            <h2>Revenue</h2>
            <p>Track active premium members and cancel plans when needed.</p>
          </div>
        </div>

        <section class="section-card">
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Billing window</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="revenue-table"></tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  </main>

  <div class="admin-modal-backdrop" id="admin-confirm">
    <div class="admin-modal-card admin-modal-card-sm">
      <h3 id="confirm-title">Confirm action</h3>
      <p id="confirm-msg">Are you sure?</p>
      <div class="admin-modal-actions">
        <button class="admin-btn admin-btn-ghost" type="button" onclick="IBlogAdmin.closeConfirm()">Cancel</button>
        <button class="admin-btn admin-btn-danger" type="button" id="confirm-ok-btn">Confirm</button>
      </div>
    </div>
  </div>

  <div class="admin-modal-backdrop" id="admin-user-modal">
    <div class="admin-modal-card">
      <div class="section-head">
        <div>
          <h3 id="user-modal-title">User details</h3>
          <p>Manage user access and plan details.</p>
        </div>
        <button class="admin-modal-close" type="button" onclick="IBlogAdmin.closeUserModal()">Close</button>
      </div>

      <form id="admin-user-form">
        <input type="hidden" id="user-form-mode" value="create">
        <input type="hidden" id="user-form-id" value="">

        <div class="admin-form-grid">
          <label class="admin-field">
            <span>Full name</span>
            <input id="user-name" type="text" required>
          </label>
          <label class="admin-field">
            <span>Email</span>
            <input id="user-email" type="email" required>
          </label>
          <label class="admin-field admin-field-full">
            <span>Password</span>
            <input id="user-password" type="password" placeholder="Leave blank to keep the current password when editing">
          </label>
          <label class="admin-field">
            <span>Plan</span>
            <select id="user-plan">
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <div class="admin-checks">
            <label class="admin-check">
              <input id="user-is-premium" type="checkbox">
              <span>Premium access</span>
            </label>
            <label class="admin-check">
              <input id="user-is-admin" type="checkbox">
              <span>Admin rights</span>
            </label>
          </div>
        </div>

        <div class="admin-modal-actions">
          <button class="admin-btn admin-btn-ghost" type="button" onclick="IBlogAdmin.closeUserModal()">Cancel</button>
          <button class="admin-btn admin-btn-primary" type="submit">Save user</button>
        </div>
      </form>
    </div>
  </div>

  <div class="admin-toast" id="admin-toast"></div>

  <script src="admin.js?v=<?= urlencode($assetVersion) ?>"></script>
</body>
</html>
