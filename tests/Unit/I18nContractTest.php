<?php
declare(strict_types=1);

namespace IBlog\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class I18nContractTest extends TestCase
{
    private string $script;

    protected function setUp(): void
    {
        parent::setUp();

        $contents = file_get_contents(dirname(__DIR__, 2) . '/js/i18n.js');
        $this->assertIsString($contents);
        $this->script = $contents;
    }

    public function testLanguageSwitcherPersistsLocaleAndRefreshesInterface(): void
    {
        $this->assertStringContainsString("const STORAGE_KEY = 'iblog_locale';", $this->script);
        $this->assertStringContainsString('function setLocale(locale)', $this->script);
        $this->assertStringContainsString('if (!SUPPORTED[locale]) return;', $this->script);
        $this->assertStringContainsString('currentLocale = locale;', $this->script);
        $this->assertStringContainsString('localStorage.setItem(STORAGE_KEY, locale);', $this->script);
        $this->assertStringContainsString('refresh();', $this->script);
    }

    public function testLocaleSwitchUpdatesHtmlAttributesAndBroadcastsChange(): void
    {
        $this->assertStringContainsString('document.documentElement.lang = info.htmlLang;', $this->script);
        $this->assertStringContainsString('document.documentElement.dir = info.dir;', $this->script);
        $this->assertStringContainsString("document.body.classList.toggle('is-rtl', info.dir === 'rtl');", $this->script);
        $this->assertStringContainsString("window.dispatchEvent(new CustomEvent('iblog:locale-changed'", $this->script);
    }

    public function testLanguageSelectorsAreBoundToSetLocale(): void
    {
        $this->assertStringContainsString("document.querySelectorAll('.iblog-language-select').forEach((select) => {", $this->script);
        $this->assertStringContainsString('select.innerHTML = languageOptionsMarkup();', $this->script);
        $this->assertStringContainsString('select.value = currentLocale;', $this->script);
        $this->assertStringContainsString("select.addEventListener('change', (event) => setLocale(event.target.value));", $this->script);
    }

    public function testCoreLocalesAndTranslatedLabelsArePresent(): void
    {
        $this->assertStringContainsString("en: { label: 'English', locale: 'en-US', dir: 'ltr', htmlLang: 'en' }", $this->script);
        $this->assertStringContainsString("fr: { label:", $this->script);
        $this->assertStringContainsString("ar: { label:", $this->script);
        $this->assertStringContainsString("htmlLang: 'fr'", $this->script);
        $this->assertStringContainsString("htmlLang: 'ar'", $this->script);
        $this->assertStringContainsString("dir: 'rtl'", $this->script);
        $this->assertStringContainsString("home: 'Accueil'", $this->script);
        $this->assertStringContainsString("signOut: 'Se deconnecter'", $this->script);
        $this->assertStringContainsString("languageTitle: 'Langue d\\'affichage'", $this->script);
    }
}
