<?php
declare(strict_types=1);

namespace IBlog\Tests\Integration;

use IBlog\Tests\Support\EndpointTestCase;

final class SessionAndLocalizationTest extends EndpointTestCase
{
    public function testLogoutClearsAuthenticatedSession(): void
    {
        $this->signIn('free@example.com');

        $beforeLogout = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'me',
        ]);
        $this->assertSame(200, $beforeLogout->status, $beforeLogout->body);
        $this->assertTrue($beforeLogout->json()['ok'] ?? false);

        $logout = $this->client->get('/backend/view/components/auth/logout.php');
        $this->assertSame(302, $logout->status);

        $afterLogout = $this->client->postJson('/backend/view/components/auth/api-auth.php', [
            'action' => 'me',
        ]);

        $this->assertSame(401, $afterLogout->status);
        $this->assertSame('Not authenticated.', $afterLogout->json()['error'] ?? null);
    }

    public function testHomePageIncludesLanguageSelectorAndLocalizationHooks(): void
    {
        $response = $this->client->get('/index.php');

        $this->assertSame(200, $response->status, $response->body);
        $html = $response->body;

        $this->assertStringContainsString('<html lang="en">', $html);
        $this->assertStringContainsString('class="iblog-language-select"', $html);
        $this->assertStringContainsString('data-i18n="settings.languageTitle"', $html);
        $this->assertStringContainsString('data-i18n="settings.languageBody"', $html);
        $this->assertStringContainsString('<option value="en">English</option>', $html);
        $this->assertStringContainsString('<option value="fr">', $html);
        $this->assertStringContainsString('<option value="ar">', $html);
        $this->assertStringContainsString('js/i18n.js', $html);
    }
}
