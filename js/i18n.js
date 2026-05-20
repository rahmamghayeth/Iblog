window.IBlog = window.IBlog || {};

IBlog.I18n = (() => {
  const STORAGE_KEY = 'iblog_locale';
  const DEFAULT_LOCALE = 'en';
  const SUPPORTED = {
    en: { label: 'English', locale: 'en-US', dir: 'ltr', htmlLang: 'en' },
    ar: { label: 'العربية', locale: 'ar', dir: 'rtl', htmlLang: 'ar' },
    fr: { label: 'Français', locale: 'fr-FR', dir: 'ltr', htmlLang: 'fr' },
    de: { label: 'Deutsch', locale: 'de-DE', dir: 'ltr', htmlLang: 'de' },
    ja: { label: '日本語', locale: 'ja-JP', dir: 'ltr', htmlLang: 'ja' },
    es: { label: 'Español', locale: 'es-ES', dir: 'ltr', htmlLang: 'es' },
    it: { label: 'Italiano', locale: 'it-IT', dir: 'ltr', htmlLang: 'it' },
    pt: { label: 'Português', locale: 'pt-PT', dir: 'ltr', htmlLang: 'pt' },
  };

  const UI = {
    en: {
      meta: { title: 'IBlog - Knowledge Without Borders' },
      nav: { home: 'Home', features: 'Features', howItWorks: 'How it works', pricing: 'Pricing', stories: 'Stories', premium: 'Premium', signIn: 'Sign in', getStarted: 'Get started', theme: 'Toggle theme' },
      hero: {
        kicker: 'Driven by curiosity',
        title: 'A blue reading room for <em>ideas that travel</em>.',
        description: 'Write, discover, and discuss long-form stories in one place, with a visual identity that now feels unmistakably IBlog.',
        primary: 'Start writing',
        secondary: 'Explore posts',
        note: 'The mascot, expressions, and doodle icons now belong to the interface instead of floating around it.'
      },
      feed: {
        empty: 'No articles to show yet.',
        curated: 'Curated for your feed',
        highMomentum: 'High momentum',
        discussionStarter: 'Discussion starter',
        widelyShared: 'Widely shared',
        curatedNote: 'Editor pick',
        listenPodcast: 'Listen as podcast',
        closePodcast: 'Close podcast',
        premiumArticle: 'Premium article',
        highQuality: 'High quality',
        goodQuality: 'Good',
        views: '{count} views',
        socialSummary: '{likes} likes · {comments} comments · {reposts} reposts',
        commentsSummary: '{count} comments',
        repostsSummary: '{count} reposts',
      },
      reactions: { react: 'React', love: 'Love', insightful: 'Insightful', helpful: 'Helpful', save: 'Save' },
      actions: {
        loadMore: 'Load more articles',
        save: 'Save',
        saved: 'Saved',
        share: 'Share',
        comment: 'Comment',
        repost: 'Repost',
        edit: 'Edit',
        delete: 'Delete',
        reply: 'Reply',
        upgrade: 'Upgrade',
        writeArticle: 'Write Article',
        newArticle: 'New Article',
        active: 'Active',
      },
      comments: { add: 'Add a comment...', messageCommunity: 'Message the community...' },
      leftRail: {
        freeMember: 'Free Member',
        premiumMember: 'Premium Member',
        main: 'Main',
        dashboard: 'Dashboard',
        account: 'Account',
        home: 'Home',
        notifications: 'Notifications',
        messages: 'Messages',
        saved: 'Saved',
        globalMap: 'Global Map',
        myArticles: 'My Articles',
        analytics: 'Analytics',
        communities: 'Communities',
        trends: 'Trend Radar',
        settings: 'Settings',
        signOut: 'Sign Out',
        light: 'Light',
        dark: 'Dark',
        language: 'Language',
        languageHint: 'Switch once and the main experience follows.',
        mascotNote: 'Built for readers who like ideas with personality.'
      },
      settings: {
        title: 'Settings',
        subtitle: 'Manage your account and preferences',
        account: 'Account',
        displayName: 'Display Name',
        emailAddress: 'Email',
        bio: 'Bio',
        saveChanges: 'Save Changes',
        languageTitle: 'Display Language',
        languageBody: 'Choose one language and apply it across the main interface, landing page, feed cards, and seeded content.',
        namePlaceholder: 'Your name',
        emailPlaceholder: 'you@example.com',
        bioPlaceholder: 'Tell your story...',
        premiumPlan: 'Premium Plan',
        freePlan: 'You are on the Free plan.',
        premiumPlanActive: 'You are on the Premium plan.',
        notifications: 'Notifications',
        newFollowers: 'New followers',
        articleLikes: 'Article likes',
        weeklyDigest: 'Weekly digest',
      },
      myArticles: { subtitle: 'Published articles and private drafts saved from the writer.' },
      map: {
        title: 'Global Trend Map',
        subtitle: 'Pick a country and jump straight into its most-read stories.',
        premiumFeature: 'Premium Feature',
        premiumBody: 'Unlock the Global Trend Map to explore what every country is reading.',
        worldTrending: 'Trending Now',
      },
      writer: {
        title: 'Write an Article',
        subtitle: 'Share your knowledge with the IBlog community',
        edit: 'Edit',
        preview: 'Preview',
        templates: 'Article Templates',
        templateLocked: '5 professional article layouts - Newspaper, Magazine, Academic, Thread, Recipe.',
        unlockTemplates: 'Upgrade to Unlock',
        articleTitle: 'Your article title...',
        articleBody: 'Start writing your article...',
        selectCategory: 'Select Category',
        tags: 'Tags: AI, machine learning...',
        imageHint: 'Your image will appear here before you publish.',
        quality: 'Article Quality',
        readability: 'Readability',
        depth: 'Depth',
        structure: 'Structure',
        engagement: 'Engagement',
        saveDraft: 'Save Draft',
        publish: 'Publish Article',
      },
      misc: {
        read: '{count} min read',
        minutes: '{count} min',
        featured: 'Featured',
        trendingWeek: 'Trending this week',
        readArticle: 'Read Article',
        about: 'About',
        privacy: 'Privacy',
        terms: 'Terms',
        allLoaded: 'All articles loaded!',
      }
    },
    ar: {
      meta: { title: 'آي بلوج - معرفة بلا حدود' },
      nav: { home: 'الرئيسية', features: 'المزايا', howItWorks: 'كيف يعمل', pricing: 'الأسعار', stories: 'القصص', premium: 'بريميوم', signIn: 'تسجيل الدخول', getStarted: 'ابدأ الآن', theme: 'تبديل المظهر' },
      hero: {
        kicker: 'مدفوع بالفضول',
        title: 'غرفة قراءة زرقاء <em>للأفكار التي تسافر</em>.',
        description: 'اكتب واكتشف وناقش المقالات الطويلة في مكان واحد، بهوية بصرية أصبحت الآن خاصة بـ IBlog بوضوح.',
        primary: 'ابدأ الكتابة',
        secondary: 'استكشف المنشورات',
        note: 'أصبحت الشخصية والوجوه التعبيرية والرموز المرسومة جزءًا من الواجهة نفسها.'
      },
      feed: {
        empty: 'لا توجد مقالات للعرض الآن.',
        curated: 'مختار من أجلك',
        highMomentum: 'زخم مرتفع',
        discussionStarter: 'يفتح النقاش',
        widelyShared: 'منتشر على نطاق واسع',
        curatedNote: 'اختيار المحرر',
        listenPodcast: 'استمع كبودكاست',
        closePodcast: 'إغلاق البودكاست',
        premiumArticle: 'مقال بريميوم',
        highQuality: 'جودة عالية',
        goodQuality: 'جيد',
        views: '{count} مشاهدة',
        socialSummary: '{likes} إعجاب · {comments} تعليق · {reposts} إعادة نشر',
        commentsSummary: '{count} تعليقات',
        repostsSummary: '{count} إعادة نشر'
      },
      reactions: { react: 'تفاعل', love: 'أحببته', insightful: 'ثري', helpful: 'مفيد', save: 'حفظ' },
      actions: {
        loadMore: 'عرض المزيد من المقالات',
        save: 'حفظ',
        saved: 'تم الحفظ',
        share: 'مشاركة',
        comment: 'تعليق',
        repost: 'إعادة نشر',
        edit: 'تعديل',
        delete: 'حذف',
        reply: 'رد',
        upgrade: 'ترقية',
        writeArticle: 'اكتب مقالاً',
        newArticle: 'مقال جديد',
        active: 'مفعل',
      },
      comments: { add: 'أضف تعليقًا...', messageCommunity: 'راسل المجتمع...' },
      leftRail: {
        freeMember: 'عضو مجاني',
        premiumMember: 'عضو بريميوم',
        main: 'الأساسي',
        dashboard: 'لوحة التحكم',
        account: 'الحساب',
        home: 'الرئيسية',
        notifications: 'الإشعارات',
        messages: 'الرسائل',
        saved: 'المحفوظات',
        globalMap: 'الخريطة العالمية',
        myArticles: 'مقالاتي',
        analytics: 'التحليلات',
        communities: 'المجتمعات',
        trends: 'رادار الاتجاهات',
        settings: 'الإعدادات',
        signOut: 'تسجيل الخروج',
        light: 'فاتح',
        dark: 'داكن',
        language: 'اللغة',
        languageHint: 'بدّل مرة واحدة وسيُطبّق على التجربة الرئيسية.',
        mascotNote: 'مصمم للقراء الذين يحبون الأفكار ذات الشخصية.'
      },
      settings: {
        title: 'الإعدادات',
        subtitle: 'إدارة حسابك وتفضيلاتك',
        account: 'الحساب',
        displayName: 'الاسم الظاهر',
        emailAddress: 'البريد الإلكتروني',
        bio: 'نبذة',
        saveChanges: 'حفظ التغييرات',
        languageTitle: 'لغة العرض',
        languageBody: 'اختر لغة واحدة لتطبيقها على الواجهة الرئيسية والصفحة الافتتاحية وبطاقات المنشورات والمحتوى الافتراضي.',
        namePlaceholder: 'اسمك',
        emailPlaceholder: 'you@example.com',
        bioPlaceholder: 'اكتب نبذة عنك...',
        premiumPlan: 'خطة بريميوم',
        freePlan: 'أنت على الخطة المجانية.',
        premiumPlanActive: 'أنت على خطة بريميوم.',
        notifications: 'الإشعارات',
        newFollowers: 'متابعون جدد',
        articleLikes: 'إعجابات المقالات',
        weeklyDigest: 'الملخص الأسبوعي',
      },
      myArticles: { subtitle: 'المقالات المنشورة والمسودات الخاصة المحفوظة من أداة الكتابة.' },
      map: {
        title: 'خريطة الاتجاهات العالمية',
        subtitle: 'اختر دولة وانتقل مباشرة إلى المقالات الأكثر قراءة فيها.',
        premiumFeature: 'ميزة بريميوم',
        premiumBody: 'افتح خريطة الاتجاهات العالمية لاستكشاف ما يقرأه كل بلد.',
        worldTrending: 'الرائج الآن',
      },
      writer: {
        title: 'اكتب مقالاً',
        subtitle: 'شارك معرفتك مع مجتمع IBlog',
        edit: 'تحرير',
        preview: 'معاينة',
        templates: 'قوالب المقالات',
        templateLocked: 'خمسة تخطيطات احترافية: صحيفة، مجلة، أكاديمي، ثريد، وصفة.',
        unlockTemplates: 'ترقية لفتحها',
        articleTitle: 'عنوان مقالك...',
        articleBody: 'ابدأ الكتابة...',
        selectCategory: 'اختر الفئة',
        tags: 'الوسوم: الذكاء الاصطناعي، تعلم الآلة...',
        imageHint: 'ستظهر صورتك هنا قبل النشر.',
        quality: 'جودة المقال',
        readability: 'سهولة القراءة',
        depth: 'العمق',
        structure: 'البنية',
        engagement: 'التفاعل',
        saveDraft: 'حفظ كمسودة',
        publish: 'نشر المقال',
      },
      misc: {
        read: 'قراءة {count} دقائق',
        minutes: '{count} د',
        featured: 'مميز',
        trendingWeek: 'الرائج هذا الأسبوع',
        readArticle: 'اقرأ المقال',
        about: 'حول',
        privacy: 'الخصوصية',
        terms: 'الشروط',
        allLoaded: 'تم تحميل كل المقالات!',
      }
    },
    fr: {
      meta: { title: 'IBlog - Le savoir sans frontieres' },
      nav: { home: 'Accueil', features: 'Fonctionnalites', howItWorks: 'Comment ca marche', pricing: 'Tarifs', stories: 'Recits', premium: 'Premium', signIn: 'Connexion', getStarted: 'Commencer', theme: 'Changer le theme' },
      hero: {
        kicker: 'Pousse par la curiosite',
        title: 'Un salon de lecture bleu pour des <em>idees qui voyagent</em>.',
        description: 'Ecrivez, decouvrez et discutez des articles de fond dans un espace dont l\'identite visuelle ressemble enfin a IBlog.',
        primary: 'Commencer a ecrire',
        secondary: 'Explorer les posts',
        note: 'Le personnage, ses expressions et les doodles font maintenant partie de l\'interface.'
      },
      feed: {
        empty: 'Aucun article a afficher pour le moment.',
        curated: 'Selectionne pour votre fil',
        highMomentum: 'Fort elan',
        discussionStarter: 'Lance la discussion',
        widelyShared: 'Tres partage',
        curatedNote: 'Choix de la redaction',
        listenPodcast: 'Ecouter en podcast',
        closePodcast: 'Fermer le podcast',
        premiumArticle: 'Article premium',
        highQuality: 'Haute qualite',
        goodQuality: 'Bon',
        views: '{count} vues',
        socialSummary: '{likes} mentions j\'aime · {comments} commentaires · {reposts} repartages',
        commentsSummary: '{count} commentaires',
        repostsSummary: '{count} repartages'
      },
      reactions: { react: 'Reagir', love: 'J\'aime', insightful: 'Pertinent', helpful: 'Utile', save: 'Sauvegarder' },
      actions: {
        loadMore: 'Afficher plus d\'articles',
        save: 'Sauvegarder',
        saved: 'Sauvegarde',
        share: 'Partager',
        comment: 'Commenter',
        repost: 'Repartager',
        edit: 'Modifier',
        delete: 'Supprimer',
        reply: 'Repondre',
        upgrade: 'Passer a Premium',
        writeArticle: 'Ecrire un article',
        newArticle: 'Nouvel article',
        active: 'Actif',
      },
      comments: { add: 'Ajouter un commentaire...', messageCommunity: 'Ecrire a la communaute...' },
      leftRail: {
        freeMember: 'Membre gratuit',
        premiumMember: 'Membre premium',
        main: 'Principal',
        dashboard: 'Tableau de bord',
        account: 'Compte',
        home: 'Accueil',
        notifications: 'Notifications',
        messages: 'Messages',
        saved: 'Sauvegardes',
        globalMap: 'Carte mondiale',
        myArticles: 'Mes articles',
        analytics: 'Analyses',
        communities: 'Communautes',
        trends: 'Radar des tendances',
        settings: 'Parametres',
        signOut: 'Se deconnecter',
        light: 'Clair',
        dark: 'Sombre',
        language: 'Langue',
        languageHint: 'Changez une fois et l\'experience principale suit.',
        mascotNote: 'Concu pour les lecteurs qui aiment les idees avec du caractere.'
      },
      settings: {
        title: 'Parametres',
        subtitle: 'Gerez votre compte et vos preferences',
        account: 'Compte',
        displayName: 'Nom affiche',
        emailAddress: 'E-mail',
        bio: 'Bio',
        saveChanges: 'Enregistrer',
        languageTitle: 'Langue d\'affichage',
        languageBody: 'Choisissez une langue et appliquez-la a l\'interface principale, a la page d\'accueil, aux posts et au contenu initial.',
        namePlaceholder: 'Votre nom',
        emailPlaceholder: 'vous@example.com',
        bioPlaceholder: 'Racontez votre histoire...',
        premiumPlan: 'Offre premium',
        freePlan: 'Vous etes sur l\'offre gratuite.',
        premiumPlanActive: 'Vous etes sur l\'offre premium.',
        notifications: 'Notifications',
        newFollowers: 'Nouveaux abonnes',
        articleLikes: 'Likes des articles',
        weeklyDigest: 'Digest hebdomadaire',
      },
      myArticles: { subtitle: 'Articles publies et brouillons prives enregistres depuis l editeur.' },
      map: {
        title: 'Carte mondiale des tendances',
        subtitle: 'Choisissez un pays et ouvrez directement ses articles les plus lus.',
        premiumFeature: 'Fonction premium',
        premiumBody: 'Debloquez la carte mondiale pour voir ce que chaque pays lit.',
        worldTrending: 'Tendance actuelle',
      },
      writer: {
        title: 'Ecrire un article',
        subtitle: 'Partagez vos connaissances avec la communaute IBlog',
        edit: 'Edition',
        preview: 'Apercu',
        templates: 'Modeles d\'article',
        templateLocked: '5 mises en page professionnelles : journal, magazine, academique, thread, recette.',
        unlockTemplates: 'Debloquer avec Premium',
        articleTitle: 'Titre de votre article...',
        articleBody: 'Commencez a ecrire...',
        selectCategory: 'Choisir une categorie',
        tags: 'Tags : IA, machine learning...',
        imageHint: 'Votre image apparaitra ici avant publication.',
        quality: 'Qualite de l\'article',
        readability: 'Lisibilite',
        depth: 'Profondeur',
        structure: 'Structure',
        engagement: 'Engagement',
        saveDraft: 'Sauvegarder le brouillon',
        publish: 'Publier l\'article',
      },
      misc: {
        read: '{count} min de lecture',
        minutes: '{count} min',
        featured: 'A la une',
        trendingWeek: 'Tendance de la semaine',
        readArticle: 'Lire l\'article',
        about: 'A propos',
        privacy: 'Confidentialite',
        terms: 'Conditions',
        allLoaded: 'Tous les articles sont charges !',
      }
    },
    de: {
      meta: { title: 'IBlog - Wissen ohne Grenzen' },
      nav: { home: 'Start', features: 'Funktionen', howItWorks: 'So funktioniert es', pricing: 'Preise', stories: 'Stories', premium: 'Premium', signIn: 'Anmelden', getStarted: 'Loslegen', theme: 'Design umschalten' },
      hero: {
        kicker: 'Von Neugier getrieben',
        title: 'Ein blauer Leseraum fuer <em>Ideen mit Reichweite</em>.',
        description: 'Schreiben, entdecken und diskutieren Sie Longform-Inhalte in einem Raum, dessen visuelle Identitaet jetzt wirklich nach IBlog aussieht.',
        primary: 'Jetzt schreiben',
        secondary: 'Posts ansehen',
        note: 'Maskottchen, Ausdrucke und Doodle-Icons sind jetzt sauber in die UI eingebaut.'
      },
      feed: {
        empty: 'Noch keine Artikel zum Anzeigen.',
        curated: 'Fuer deinen Feed kuratiert',
        highMomentum: 'Starker Schwung',
        discussionStarter: 'Startet Diskussionen',
        widelyShared: 'Weit geteilt',
        curatedNote: 'Auswahl der Redaktion',
        listenPodcast: 'Als Podcast anhoeren',
        closePodcast: 'Podcast schliessen',
        premiumArticle: 'Premium-Artikel',
        highQuality: 'Hohe Qualitaet',
        goodQuality: 'Gut',
        views: '{count} Aufrufe',
        socialSummary: '{likes} Likes · {comments} Kommentare · {reposts} Reposts',
        commentsSummary: '{count} Kommentare',
        repostsSummary: '{count} Reposts'
      },
      reactions: { react: 'Reagieren', love: 'Liebe', insightful: 'Einsichtsreich', helpful: 'Hilfreich', save: 'Speichern' },
      actions: {
        loadMore: 'Mehr Artikel laden',
        save: 'Speichern',
        saved: 'Gespeichert',
        share: 'Teilen',
        comment: 'Kommentieren',
        repost: 'Reposten',
        edit: 'Bearbeiten',
        delete: 'Loeschen',
        reply: 'Antworten',
        upgrade: 'Upgrade',
        writeArticle: 'Artikel schreiben',
        newArticle: 'Neuer Artikel',
        active: 'Aktiv',
      },
      comments: { add: 'Kommentar hinzufuegen...', messageCommunity: 'Nachricht an die Community...' },
      leftRail: {
        freeMember: 'Kostenloses Mitglied',
        premiumMember: 'Premium-Mitglied',
        main: 'Hauptbereich',
        dashboard: 'Dashboard',
        account: 'Konto',
        home: 'Start',
        notifications: 'Benachrichtigungen',
        messages: 'Nachrichten',
        saved: 'Gespeichert',
        globalMap: 'Weltkarte',
        myArticles: 'Meine Artikel',
        analytics: 'Analysen',
        communities: 'Communities',
        trends: 'Trendradar',
        settings: 'Einstellungen',
        signOut: 'Abmelden',
        light: 'Hell',
        dark: 'Dunkel',
        language: 'Sprache',
        languageHint: 'Einmal wechseln und die Hauptoberflaeche folgt.',
        mascotNote: 'Fuer Leserinnen und Leser, die Ideen mit Charakter moegen.'
      },
      settings: {
        title: 'Einstellungen',
        subtitle: 'Verwalte dein Konto und deine Einstellungen',
        account: 'Konto',
        displayName: 'Anzeigename',
        emailAddress: 'E-Mail',
        bio: 'Bio',
        saveChanges: 'Aenderungen speichern',
        languageTitle: 'Anzeigesprache',
        languageBody: 'Waehle eine Sprache und wende sie auf die Hauptoberflaeche, die Startseite, die Feed-Karten und die Seed-Inhalte an.',
        namePlaceholder: 'Dein Name',
        emailPlaceholder: 'du@example.com',
        bioPlaceholder: 'Erzaehl deine Geschichte...',
        premiumPlan: 'Premium-Plan',
        freePlan: 'Du nutzt den Free-Plan.',
        premiumPlanActive: 'Du nutzt den Premium-Plan.',
        notifications: 'Benachrichtigungen',
        newFollowers: 'Neue Follower',
        articleLikes: 'Artikel-Likes',
        weeklyDigest: 'Wochenrueckblick',
      },
      myArticles: { subtitle: 'Veroeffentlichte Artikel und private Entwuerfe aus dem Editor.' },
      map: {
        title: 'Globale Trendkarte',
        subtitle: 'Waehle ein Land und springe direkt zu den meistgelesenen Artikeln.',
        premiumFeature: 'Premium-Funktion',
        premiumBody: 'Schalte die globale Trendkarte frei, um zu sehen, was jedes Land liest.',
        worldTrending: 'Jetzt im Trend',
      },
      writer: {
        title: 'Artikel schreiben',
        subtitle: 'Teile dein Wissen mit der IBlog-Community',
        edit: 'Bearbeiten',
        preview: 'Vorschau',
        templates: 'Artikelvorlagen',
        templateLocked: '5 professionelle Layouts: Zeitung, Magazin, akademisch, Thread, Rezept.',
        unlockTemplates: 'Per Upgrade freischalten',
        articleTitle: 'Titel deines Artikels...',
        articleBody: 'Schreibe hier los...',
        selectCategory: 'Kategorie waehlen',
        tags: 'Tags: KI, Machine Learning...',
        imageHint: 'Dein Bild erscheint hier vor der Veroeffentlichung.',
        quality: 'Artikelqualitaet',
        readability: 'Lesbarkeit',
        depth: 'Tiefe',
        structure: 'Struktur',
        engagement: 'Engagement',
        saveDraft: 'Entwurf speichern',
        publish: 'Artikel veroeffentlichen',
      },
      misc: {
        read: '{count} Min. Lesezeit',
        minutes: '{count} Min.',
        featured: 'Featured',
        trendingWeek: 'Diese Woche im Trend',
        readArticle: 'Artikel lesen',
        about: 'Ueber uns',
        privacy: 'Datenschutz',
        terms: 'AGB',
        allLoaded: 'Alle Artikel wurden geladen!',
      }
    },
    ja: {
      meta: { title: 'IBlog - 国境のない知識' },
      nav: { home: 'ホーム', features: '機能', howItWorks: '使い方', pricing: '料金', stories: 'ストーリー', premium: 'プレミアム', signIn: 'サインイン', getStarted: '始める', theme: 'テーマ切替' },
      hero: {
        kicker: '好奇心が原動力',
        title: 'アイデアが広がる <em>青い読書空間</em>。',
        description: '長文記事を書き、見つけ、語り合える場所を、IBlogらしいビジュアルでまとめ直しました。',
        primary: '書き始める',
        secondary: '投稿を見る',
        note: 'マスコット、表情、落書きアイコンが、いまはきちんとUIの中で機能しています。'
      },
      feed: {
        empty: '表示できる記事はまだありません。',
        curated: 'あなた向けに選定',
        highMomentum: '勢いあり',
        discussionStarter: '議論を生む投稿',
        widelyShared: '広く共有中',
        curatedNote: '編集部ピック',
        listenPodcast: 'ポッドキャストで聴く',
        closePodcast: 'ポッドキャストを閉じる',
        premiumArticle: 'プレミアム記事',
        highQuality: '高品質',
        goodQuality: '良好',
        views: '{count} 閲覧',
        socialSummary: 'いいね {likes} · コメント {comments} · 再投稿 {reposts}',
        commentsSummary: 'コメント {count}',
        repostsSummary: '再投稿 {count}'
      },
      reactions: { react: 'リアクション', love: '好き', insightful: '参考になる', helpful: '役立つ', save: '保存' },
      actions: {
        loadMore: '記事をもっと見る',
        save: '保存',
        saved: '保存済み',
        share: '共有',
        comment: 'コメント',
        repost: '再投稿',
        edit: '編集',
        delete: '削除',
        reply: '返信',
        upgrade: 'アップグレード',
        writeArticle: '記事を書く',
        newArticle: '新しい記事',
        active: '有効',
      },
      comments: { add: 'コメントを追加...', messageCommunity: 'コミュニティに送信...' },
      leftRail: {
        freeMember: '無料メンバー',
        premiumMember: 'プレミアムメンバー',
        main: 'メイン',
        dashboard: 'ダッシュボード',
        account: 'アカウント',
        home: 'ホーム',
        notifications: '通知',
        messages: 'メッセージ',
        saved: '保存済み',
        globalMap: 'グローバルマップ',
        myArticles: '自分の記事',
        analytics: '分析',
        communities: 'コミュニティ',
        trends: 'トレンドレーダー',
        settings: '設定',
        signOut: 'サインアウト',
        light: 'ライト',
        dark: 'ダーク',
        language: '言語',
        languageHint: '一度切り替えれば、主要画面全体に反映されます。',
        mascotNote: '個性のあるアイデアを好む読者のための設計です。'
      },
      settings: {
        title: '設定',
        subtitle: 'アカウントと設定を管理します',
        account: 'アカウント',
        displayName: '表示名',
        emailAddress: 'メール',
        bio: '自己紹介',
        saveChanges: '変更を保存',
        languageTitle: '表示言語',
        languageBody: '選択した言語を、主要UI、ランディング、フィードカード、初期コンテンツに適用します。',
        namePlaceholder: 'あなたの名前',
        emailPlaceholder: 'you@example.com',
        bioPlaceholder: 'あなたのストーリーを書いてください...',
        premiumPlan: 'プレミアムプラン',
        freePlan: '現在は無料プランです。',
        premiumPlanActive: '現在はプレミアムプランです。',
        notifications: '通知',
        newFollowers: '新しいフォロワー',
        articleLikes: '記事へのいいね',
        weeklyDigest: '週間ダイジェスト',
      },
      myArticles: { subtitle: '公開済み記事とエディタから保存した非公開下書きです。' },
      map: {
        title: 'グローバルトレンドマップ',
        subtitle: '国を選ぶと、その国で最も読まれている記事にすぐ移動できます。',
        premiumFeature: 'プレミアム機能',
        premiumBody: '各国で読まれている内容を確認するには、グローバルトレンドマップを解除してください。',
        worldTrending: '現在のトレンド',
      },
      writer: {
        title: '記事を書く',
        subtitle: 'IBlogコミュニティに知識を共有しましょう',
        edit: '編集',
        preview: 'プレビュー',
        templates: '記事テンプレート',
        templateLocked: '新聞、雑誌、学術、スレッド、レシピの5種類のレイアウト。',
        unlockTemplates: 'アップグレードで解除',
        articleTitle: '記事タイトル...',
        articleBody: 'ここから書き始めてください...',
        selectCategory: 'カテゴリを選択',
        tags: 'タグ: AI、機械学習...',
        imageHint: '公開前にここへ画像が表示されます。',
        quality: '記事品質',
        readability: '読みやすさ',
        depth: '深さ',
        structure: '構成',
        engagement: '反応',
        saveDraft: '下書きを保存',
        publish: '記事を公開',
      },
      misc: {
        read: '{count}分で読めます',
        minutes: '{count}分',
        featured: '注目',
        trendingWeek: '今週のトレンド',
        readArticle: '記事を読む',
        about: '概要',
        privacy: 'プライバシー',
        terms: '利用規約',
        allLoaded: 'すべての記事を読み込みました！',
      }
    }
  };

  const CATEGORY_MAP = {
    ar: { Technology: 'التكنولوجيا', Design: 'التصميم', Startups: 'الشركات الناشئة', Travel: 'السفر', Culture: 'الثقافة', AI: 'الذكاء الاصطناعي', Science: 'العلوم', Health: 'الصحة', Finance: 'المالية', Education: 'التعليم', Psychology: 'علم النفس', Politics: 'السياسة', Sports: 'الرياضة', Food: 'الطعام', History: 'التاريخ', Music: 'الموسيقى', Gaming: 'الألعاب', Space: 'الفضاء', Environment: 'البيئة' },
    fr: { Technology: 'Technologie', Design: 'Design', Startups: 'Startups', Travel: 'Voyage', Culture: 'Culture', AI: 'IA', Science: 'Science', Health: 'Sante', Finance: 'Finance', Education: 'Education', Psychology: 'Psychologie', Politics: 'Politique', Sports: 'Sport', Food: 'Cuisine', History: 'Histoire', Music: 'Musique', Gaming: 'Gaming', Space: 'Espace', Environment: 'Environnement' },
    de: { Technology: 'Technologie', Design: 'Design', Startups: 'Start-ups', Travel: 'Reisen', Culture: 'Kultur', AI: 'KI', Science: 'Wissenschaft', Health: 'Gesundheit', Finance: 'Finanzen', Education: 'Bildung', Psychology: 'Psychologie', Politics: 'Politik', Sports: 'Sport', Food: 'Essen', History: 'Geschichte', Music: 'Musik', Gaming: 'Gaming', Space: 'Weltraum', Environment: 'Umwelt' },
    ja: { Technology: 'テクノロジー', Design: 'デザイン', Startups: 'スタートアップ', Travel: '旅行', Culture: 'カルチャー', AI: 'AI', Science: '科学', Health: '健康', Finance: '金融', Education: '教育', Psychology: '心理学', Politics: '政治', Sports: 'スポーツ', Food: '食', History: '歴史', Music: '音楽', Gaming: 'ゲーム', Space: '宇宙', Environment: '環境' }
  };

  const TOPIC_MAP = {
    ar: { 'AI workflows': 'سير عمل الذكاء الاصطناعي', 'Product design': 'تصميم المنتجات', 'Remote teams': 'الفرق البعيدة', 'Creator economy': 'اقتصاد المبدعين', 'Climate reporting': 'تغطية المناخ', 'Startup playbooks': 'أدلة الشركات الناشئة', 'Writing systems': 'أنظمة الكتابة', 'Travel culture': 'ثقافة السفر' },
    fr: { 'AI workflows': 'Workflows IA', 'Product design': 'Design produit', 'Remote teams': 'Equipes distribuees', 'Creator economy': 'Economie des createurs', 'Climate reporting': 'Journalisme climat', 'Startup playbooks': 'Methodes startup', 'Writing systems': 'Systemes de redaction', 'Travel culture': 'Culture du voyage' },
    de: { 'AI workflows': 'KI-Workflows', 'Product design': 'Produktdesign', 'Remote teams': 'Remote-Teams', 'Creator economy': 'Creator Economy', 'Climate reporting': 'Klimaberichterstattung', 'Startup playbooks': 'Startup-Playbooks', 'Writing systems': 'Schreibsysteme', 'Travel culture': 'Reisekultur' },
    ja: { 'AI workflows': 'AIワークフロー', 'Product design': 'プロダクトデザイン', 'Remote teams': 'リモートチーム', 'Creator economy': 'クリエイター経済', 'Climate reporting': '気候報道', 'Startup playbooks': 'スタートアップ運営', 'Writing systems': '執筆システム', 'Travel culture': '旅のカルチャー' }
  };

  const ARTICLE_TRANSLATIONS = {
    ar: {
      9001: {
        cat: 'التكنولوجيا',
        category: 'التكنولوجيا',
        title: 'كيف تستخدم الفرق التحريرية الصغيرة الذكاء الاصطناعي من دون أن تفقد صوتها',
        excerpt: 'دليل عملي لاستخدام الذكاء الاصطناعي كمساعد في البحث والبناء والإنتاج مع الحفاظ على النبرة التي يثق بها القراء.',
        body: 'الفرق التحريرية الصغيرة لا تحتاج إلى أدوات أكثر بقدر ما تحتاج إلى وضوح أكبر.\n\nأفضل سير عمل للذكاء الاصطناعي لا يستبدل صوت الكاتب. هو يختصر الأعمال المتكررة، ويحفظ أثر البحث، ويمنح الفريق وقتًا أكبر لصياغة الأفكار التي تبقى مع القارئ.\n\nالإعداد الأكثر موثوقية بسيط: استخدم الذكاء الاصطناعي لجمع المراجع، وتنظيم الملاحظات، وصياغة هيكل أولي. ثم أعد بناء المقال بحكمك البشري وأمثلتك ونبرة فريقك.',
        tags: ['الذكاء الاصطناعي', 'الكتابة', 'التحرير']
      },
      9002: {
        cat: 'التصميم',
        category: 'التصميم',
        title: 'تنمو أنظمة التصميم أسرع عندما يجلس الكتّاب داخل حلقة المراجعة',
        excerpt: 'جودة التوثيق تغيّر سرعة التبنّي. لهذا يجب أن تكون كتابة المنتج جزءًا من مراجعة المكونات، لا خطوة لاحقة.',
        body: 'نظام التصميم ليس مجرد مجموعة مكونات. إنه لغة مشتركة.\n\nعندما يدخل الكتّاب إلى حلقة المراجعة، تتحسن التسميات، وتصبح الحالات الفارغة أوضح، وتبدأ الوثائق بالإجابة عن الأسئلة الحقيقية التي تطرحها الفرق.\n\nالأنظمة القوية تقلل الغموض. وهذا يعني العناية بالأسماء، وكتابة أمثلة واقعية، واعتبار الميكروكوبي جزءًا من بنية المنتج.',
        tags: ['التصميم', 'الأنظمة', 'المنتج']
      },
      9003: {
        cat: 'الشركات الناشئة',
        category: 'الشركات الناشئة',
        title: 'دليل الفريق البعيد الذي يحافظ على نشر أسبوعي ثابت',
        excerpt: 'إيقاع تشغيل خفيف للفرق الصغيرة التي تريد مقالات منتظمة وموافقات أنظف وتأخيرًا أقل في النشر.',
        body: 'الثبات غالبًا مشكلة تنظيم قبل أن يكون مشكلة موهبة.\n\nالفرق التي تنشر كل أسبوع تعتمد بنية بسيطة: مالك واحد، مراجع واحد، موعد نهائي للحقائق، وموعد نهائي للتحرير. هذا الإيقاع يقلل إعادة الكتابة في اللحظة الأخيرة.\n\nالإيقاع الواضح أفضل من تكديس الأدوات. إذا فهم الجميع معنى جاهز للمراجعة، يصبح النشر أكثر هدوءًا.',
        tags: ['الشركات الناشئة', 'العمل عن بعد', 'العمليات']
      },
      9004: {
        cat: 'السفر',
        category: 'السفر',
        title: 'لماذا تحقق قصص السفر المحلية نتائج أفضل من الأدلة العامة للمدن',
        excerpt: 'يثق القراء في المقالات التي تبدو معيشة حقًا. هذه التفاصيل التحريرية الصغيرة تجعل الكتابة السياحية أكثر فائدة ومصداقية.',
        body: 'أفضل كتابة سفر هي الأكثر تحديدًا.\n\nيتذكر القارئ طابور المخبز قبل الشروق، والتحذير الصادق من سيارات الأجرة، والحي الذي يتبدل مزاجه بعد الغروب. هذه التفاصيل لا تضيف سحرًا فقط، بل تصنع الثقة.\n\nالقصص المحلية تنتشر أيضًا لأنها شخصية وليست منسوخة، ولذلك يسهل مشاركتها والعودة إليها لاحقًا.',
        tags: ['السفر', 'الثقافة', 'السرد']
      },
      9005: {
        cat: 'الثقافة',
        category: 'الثقافة',
        title: 'يستمر المبدعون في الفوز عندما تبدو المجتمعات أصغر مما هي عليه',
        excerpt: 'المنصات الأكثر تفاعلًا هي التي تصنع إحساسًا بالألفة على نطاق واسع. هكذا تجعل الإشارات الصغيرة المجتمع أكثر إنسانية.',
        body: 'تصميم المجتمع هو غالبًا سؤال عن المسافة العاطفية.\n\nعندما يشعر الناس بأنهم مرئيون، فإنهم يبقون. ويمكن أن يأتي ذلك من أشياء بسيطة: ردود أوضح، وصفحات مؤلفين أفضل، وتوصيات تعكس المشاركة الحقيقية.\n\nأقوى المجتمعات لا تنمو فقط، بل تقلل الشعور بالمسافة بين الإنسان والمنصة.',
        tags: ['الثقافة', 'المجتمع', 'المبدعون']
      }
    },
    fr: {
      9001: {
        cat: 'Technologie',
        category: 'Technologie',
        title: 'Comment les petites equipes editoriales utilisent l\'IA sans perdre leur voix',
        excerpt: 'Guide pratique pour utiliser l\'IA comme assistante de recherche, de structure et de production tout en gardant le ton que les lecteurs reconnaissent.',
        body: 'Les petites equipes editoriales n\'ont pas besoin de plus d\'outils. Elles ont besoin de plus de clarte.\n\nLes meilleurs workflows IA ne remplacent pas la voix du redacteur. Ils reduisent le travail repetitif, preservent la trace de recherche et laissent plus de temps pour faconner les idees qui restent en tete.\n\nLe schema le plus fiable reste simple : collecter les sources, organiser les notes, preparer une structure, puis reconstruire l\'article avec du jugement humain.',
        tags: ['IA', 'Ecriture', 'Editorial']
      },
      9002: {
        cat: 'Design',
        category: 'Design',
        title: 'Les design systems avancent plus vite quand les redacteurs participent a la revue',
        excerpt: 'La qualite de la documentation change la vitesse d\'adoption. La content design doit vivre dans la revue des composants.',
        body: 'Un design system n\'est pas seulement une collection de composants. C\'est un langage partage.\n\nQuand les redacteurs rejoignent la boucle de revue, les labels s\'ameliorent, les etats vides deviennent plus clairs et la documentation repond mieux aux vraies questions des equipes.\n\nLes systemes solides reduisent l\'ambiguite. Cela passe par des noms plus precis, des exemples credibles et des microcopies traitees comme de l\'architecture produit.',
        tags: ['Design', 'Systemes', 'Produit']
      },
      9003: {
        cat: 'Startups',
        category: 'Startups',
        title: 'Le playbook d\'equipe distribuee qui garde un rythme de publication hebdomadaire',
        excerpt: 'Un rythme simple pour les petites equipes qui veulent publier regulierement avec moins de friction.',
        body: 'La regularite est souvent un probleme de rythme avant d\'etre un probleme de talent.\n\nLes equipes qui publient chaque semaine utilisent generalement la meme structure legere : un responsable, un relecteur, une echeance pour les faits et une autre pour l\'edition.\n\nUn rythme clair bat une pile d\'outils trop compliquee. Quand chacun sait ce que signifie pret pour revue, la publication devient plus calme.',
        tags: ['Startups', 'Travail a distance', 'Operations']
      },
      9004: {
        cat: 'Voyage',
        category: 'Voyage',
        title: 'Pourquoi les recits de voyage locaux convertissent mieux que les guides generiques',
        excerpt: 'Les lecteurs font confiance aux articles qui semblent vecus. Ce sont ces details qui rendent le tourisme plus utile.',
        body: 'Les meilleurs recits de voyage sont precis.\n\nOn retient la file devant la boulangerie a l\'aube, l\'avertissement honnete sur les taxis, le quartier qui change apres la nuit. Ces details ne servent pas qu\'a faire joli : ils creent de la confiance.\n\nLes histoires locales voyagent aussi plus loin parce qu\'elles paraissent personnelles plutot que copiees.',
        tags: ['Voyage', 'Culture', 'Recit']
      },
      9005: {
        cat: 'Culture',
        category: 'Culture',
        title: 'Les createurs gagnent quand les communautes paraissent plus proches qu\'elles ne le sont',
        excerpt: 'Les plateformes les plus engageantes creent de l\'intimite a grande echelle. Voici comment les petits signaux changent tout.',
        body: 'Le design communautaire est souvent une question de distance emotionnelle.\n\nQuand les personnes se sentent vues, elles restent. Cela peut venir de choses simples : de meilleures reponses, de meilleures pages auteur et des recommandations plus humaines.\n\nLes communautes les plus fortes ne font pas que croitre. Elles reduisent aussi la distance ressentie entre la personne et la plateforme.',
        tags: ['Culture', 'Communaute', 'Createurs']
      }
    },
    de: {
      9001: {
        cat: 'Technologie',
        category: 'Technologie',
        title: 'Wie kleine Redaktionsteams KI nutzen, ohne ihre Stimme zu verlieren',
        excerpt: 'Ein praxisnaher Leitfaden fuer Recherche, Struktur und Produktion mit KI, ohne den Ton zu opfern, dem Leser vertrauen.',
        body: 'Kleine Redaktionsteams brauchen selten mehr Tools. Sie brauchen mehr Klarheit.\n\nDie besten KI-Workflows ersetzen nicht die Stimme des Autors. Sie verkuerzen repetitive Arbeit, halten Recherchepfade fest und schaffen mehr Zeit fuer starke Ideen.\n\nDas verlaesslichste Setup ist einfach: Quellen sammeln, Notizen ordnen, eine erste Struktur bauen und den Text danach mit menschlichem Urteilsvermoegen neu formen.',
        tags: ['KI', 'Schreiben', 'Redaktion']
      },
      9002: {
        cat: 'Design',
        category: 'Design',
        title: 'Design-Systeme wachsen schneller, wenn Autorinnen und Autoren in der Review-Runde sitzen',
        excerpt: 'Dokumentationsqualitaet veraendert Adoption. Darum gehoert Content Design in die Komponenten-Review.',
        body: 'Ein Design-System ist nicht nur eine Sammlung von Komponenten. Es ist eine gemeinsame Sprache.\n\nWenn Schreibende Teil der Review-Schleife werden, verbessern sich Labels, Empty States und die Dokumentation beantwortet eher die echten Fragen der Teams.\n\nStarke Systeme reduzieren Mehrdeutigkeit. Das bedeutet saubere Namen, glaubwuerdige Beispiele und Microcopy als Teil der Produktarchitektur.',
        tags: ['Design', 'Systeme', 'Produkt']
      },
      9003: {
        cat: 'Start-ups',
        category: 'Start-ups',
        title: 'Das Remote-Team-Playbook fuer einen verlaesslichen Wochenrhythmus',
        excerpt: 'Ein leichter Arbeitsrhythmus fuer kleine Teams, die regelmaessig publizieren wollen.',
        body: 'Konstanz ist oft zuerst ein Taktproblem und erst spaeter ein Talentproblem.\n\nTeams mit woechentlicher Veroeffentlichung nutzen meist die gleiche leichte Struktur: eine verantwortliche Person, eine Review-Stimme und klare Termine fuer Fakten und Bearbeitung.\n\nEin ruhiger Rhythmus schlaegt einen komplizierten Tool-Stack. Wenn alle wissen, was bereit fuer Review bedeutet, wirkt Publizieren ploetzlich beherrschbar.',
        tags: ['Start-ups', 'Remote Work', 'Ablauf']
      },
      9004: {
        cat: 'Reisen',
        category: 'Reisen',
        title: 'Warum lokale Reisegeschichten besser funktionieren als generische Stadtfuehrer',
        excerpt: 'Leser vertrauen Artikeln, die wirklich erlebt wirken. Genau diese Details machen Reisetexte glaubwuerdiger.',
        body: 'Die besten Reisetexte sind konkret.\n\nMan erinnert sich an die Baeckereischlange vor Sonnenaufgang, die ehrliche Warnung zu Taxirouten und das Viertel, das abends seine Stimmung wechselt. Diese Details schaffen Vertrauen.\n\nLokale Geschichten verbreiten sich weiter, weil sie persoenlich statt kopiert wirken.',
        tags: ['Reisen', 'Kultur', 'Storytelling']
      },
      9005: {
        cat: 'Kultur',
        category: 'Kultur',
        title: 'Creator gewinnen weiter, wenn Communities kleiner wirken als sie sind',
        excerpt: 'Die spannendsten Plattformen erzeugen Naehe im grossen Massstab. Kleine Signale machen den Unterschied.',
        body: 'Community-Design ist oft eine Frage emotionaler Distanz.\n\nWenn Menschen sich gesehen fuehlen, bleiben sie. Das kann aus klareren Antworten, besseren Autorenseiten oder Empfehlungen entstehen, die echte Beteiligung widerspiegeln.\n\nDie staerksten Communities wachsen nicht nur. Sie verkleinern auch das Gefuehl der Distanz zwischen Person und Plattform.',
        tags: ['Kultur', 'Community', 'Creator']
      }
    },
    ja: {
      9001: {
        cat: 'テクノロジー',
        category: 'テクノロジー',
        title: '小さな編集チームが声を失わずにAIを使う方法',
        excerpt: '調査、構成、制作をAIに手伝わせながら、読者が信頼する人間らしいトーンを守るための実践ガイドです。',
        body: '小さな編集チームに必要なのは、ツールの数ではなく判断の明瞭さです。\n\n優れたAIワークフローは書き手の声を置き換えません。反復作業を減らし、調査の流れを残し、読者に残るアイデアを磨く時間を増やします。\n\n最も信頼できる形はシンプルです。資料を集め、ノートを整理し、最初の構成を作り、そのあとで人の判断と具体例で記事を作り直します。',
        tags: ['AI', '執筆', '編集']
      },
      9002: {
        cat: 'デザイン',
        category: 'デザイン',
        title: '書き手がレビューに入るとデザインシステムは速く育つ',
        excerpt: 'ドキュメントの質は導入速度を変えます。だからこそ、コンテンツ設計は後工程ではなくレビュー工程に入るべきです。',
        body: 'デザインシステムは単なるコンポーネント集ではありません。共通言語です。\n\n書き手がレビューに加わると、ラベルは改善され、空状態は分かりやすくなり、ドキュメントはチームの本当の疑問に答え始めます。\n\n強いシステムは曖昧さを減らします。命名、実感のある例、そしてマイクロコピーをプロダクト設計の一部として扱うことが重要です。',
        tags: ['デザイン', 'システム', 'プロダクト']
      },
      9003: {
        cat: 'スタートアップ',
        category: 'スタートアップ',
        title: '毎週の公開を守るためのリモートチーム運営メモ',
        excerpt: '小さなチームが継続して記事を出すための、軽くて現実的な運営リズムです。',
        body: '継続性は、才能の問題である前に、たいてい運営のリズムの問題です。\n\n毎週公開できるチームには共通点があります。担当者、レビュー担当、事実確認の締切、編集の締切が明確です。\n\n複雑なツール群より、共有されたリズムのほうが強い。レビュー準備完了の意味が全員に揃っていれば、公開は落ち着いて進みます。',
        tags: ['スタートアップ', 'リモート', '運営']
      },
      9004: {
        cat: '旅行',
        category: '旅行',
        title: 'なぜローカルな旅の物語は汎用的な観光ガイドより刺さるのか',
        excerpt: '実際にそこで過ごしたように感じられる記事ほど、読者は信頼します。小さな編集判断が有用性を大きく変えます。',
        body: '良い旅の文章は具体的です。\n\n夜明け前のパン屋の列、正直なタクシー事情、日が落ちると空気が変わる街区。そうした細部は飾りではなく信頼を作ります。\n\nローカルな物語は、コピーではなく体験に見えるからこそ、共有され、検索され、あとでまた読まれます。',
        tags: ['旅行', 'カルチャー', '物語']
      },
      9005: {
        cat: 'カルチャー',
        category: 'カルチャー',
        title: 'コミュニティが実際より小さく感じられるほどクリエイターは強い',
        excerpt: '大きな場でも親密さを作れるプラットフォームが強い。小さなシグナルが人間らしさを生みます。',
        body: 'コミュニティ設計は、しばしば感情的な距離の設計です。\n\n人は自分が見えていると感じる場所に残ります。それは、返答の明瞭さ、著者ページ、参加を反映した推薦といった小さな要素から生まれます。\n\n強いコミュニティは大きくなるだけではありません。人とプラットフォームの距離感も縮めます。',
        tags: ['カルチャー', 'コミュニティ', 'クリエイター']
      }
    }
  };

  const EXTRA_UI = {
    en: {
      rightRail: {
        searchPlaceholder: 'Search IBlog...',
        yourStats: 'Your Stats',
        articles: 'Articles',
        likes: 'Likes',
        comments: 'Comments',
        saved: 'Saved',
        trendingTopics: 'Trending Topics',
        communities: 'Communities',
        topAuthors: 'Top Authors',
        loading: 'Loading...',
        weeklyDigest: 'Weekly Digest',
        stayInLoop: 'Stay in the loop',
        digestCopy: '5 best articles, curated every week.',
        subscribe: 'Subscribe',
        about: 'About',
        blog: 'Blog',
        privacy: 'Privacy',
        terms: 'Terms',
        noDataYet: 'No data yet.',
        noTrendingTopics: 'No trending topics yet',
        noCommunitiesJoined: 'No communities joined yet.',
        likesUnit: 'likes',
        commentsUnit: 'comments',
        articlesUnit: 'art.',
        interactionsUnit: 'interactions',
        premium: 'Premium',
        message: 'Message',
        follow: 'Follow',
        following: 'Following',
        enterChat: 'Enter Chat',
        leave: 'Leave',
        invalidEmail: 'Please enter a valid email',
        subscribed: 'Subscribed! Weekly digest incoming.',
      },
      search: {
        title: 'Search',
        subtitle: 'Find the best article and author matches from live platform content.',
        placeholder: 'Search articles, categories, tags, or author names...',
        button: 'Search',
        liveRanking: 'Live ranking',
        articlesPeople: 'Articles and people',
        minLetters: 'Type at least 2 letters to start.',
        all: 'All',
        articles: 'Articles',
        people: 'People',
        startTitle: 'Start with a keyword',
        startBody: 'Try an article title, a topic, or an author name.',
        emptyTitle: 'No results',
        emptyBody: 'Try another keyword, category, or author name.',
        resultsFor: '{count} results for "{query}"',
        resultFor: '{count} result for "{query}"',
        view: 'View',
        message: 'Message',
        profile: 'Profile',
        author: 'Author',
        open: 'Open',
        article: 'Article',
        byInRead: 'By {author} in {category} / {readTime}',
        views: 'Views {count}',
        likes: 'Likes {count}',
        premiumSnippet: 'Premium member publishing on IBlog.',
        profileSnippet: 'IBlog author profile.',
        match: 'Match',
        exactMatch: 'Exact Match',
        highPrecision: 'High Precision',
        strongMatch: 'Strong Match',
        score: 'Score {score}',
        plan: '{plan} plan',
        free: 'Free',
        premium: 'Premium',
        untitledArticle: 'Untitled article',
        unknown: 'Unknown',
        general: 'General',
      },
      communities: {
        title: 'Community Spaces',
        subtitle: 'Topic-based communities for deep knowledge sharing',
        create: 'Create Community',
        modalTitle: 'New Community',
        modalSubtitle: 'Build a focused space for your audience',
        nameLabel: 'Community Name',
        namePlaceholder: 'e.g. AI Ethics Discussion',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'What topics will this community cover?',
        topicsLabel: 'Topics / Tags',
        topicsHint: 'comma separated',
        topicsPlaceholder: 'e.g. AI, Ethics, Policy',
        searchPlaceholder: 'Search communities, topics, or creators...',
        clearAria: 'Clear search',
        loading: 'Loading communities...',
        empty: 'No communities yet. Be the first to create one!',
        emptyMatch: 'No communities match "{query}"',
        member: 'member',
        members: 'members',
        openChat: 'Open Chat',
        leave: 'Leave',
        join: 'Join Community',
        joining: 'Joining...',
        leaving: 'Leaving...',
        signInJoin: 'Sign in to join',
        signInCreate: 'Please sign in',
        joined: 'Joined!',
        left: 'Left community',
        joinError: 'Could not join',
        leaveError: 'Could not leave',
        createError: 'Could not create community',
        networkError: 'Network error',
        signInFirst: 'Sign in first',
        chatLoading: 'Chat loading...',
        byCreator: 'by',
        premiumFeature: 'Premium feature',
        nameRequired: 'Name is required',
        descriptionRequired: 'Description is required',
        creating: 'Creating...',
        created: '"{name}" created!',
      },
      notifications: {
        empty: 'No notifications yet',
        unread: '{count} unread',
        markAllRead: 'Mark all as read',
        allReadToast: 'All notifications marked as read',
        welcomeBack: '<strong>IBlog</strong>: Welcome back.',
        likedArticle: 'You liked <strong>{title}</strong>.',
        sharedArticle: 'You shared <strong>{title}</strong>.',
        commentedArticle: 'New comment on <strong>{title}</strong>.',
        privateMessageSent: 'New private message sent to <strong>{name}</strong>.',
        communityMessage: 'New message in <strong>{community}</strong>: {message}',
        justNow: 'Just now',
      },
      messages: {
        privateMessaging: 'Private messaging',
        inbox: 'Inbox',
        sidebarCopy: 'Keep conversations focused, fast, and easy to scan.',
        searchPlaceholder: 'Search people or conversations...',
        conversations: 'Conversations',
        conversationPeople: 'Conversation people',
        selectConversation: 'Select a conversation',
        selectConversationBody: 'Choose someone from the inbox or the conversation people list to begin.',
        startDirectMessage: 'Start a direct message',
        startDirectMessageBody: 'Use the conversation people list to begin a private conversation and keep the thread in one place.',
        pickConversationPlaceholder: 'Pick a conversation to write a message...',
        writeMessagePlaceholder: 'Write a private message...',
        sendShortcut: 'Press Ctrl + Enter to send quickly.',
        send: 'Send',
        noMatchingConversations: 'No matching conversations.',
        noPrivateConversations: 'No private conversations yet.',
        noMatchingPeople: 'No matching people found.',
        noConversationPeople: 'No conversation people yet. Start a chat from a profile or search result.',
        viewProfile: 'View profile',
        deleteConversation: 'Delete conversation',
        privateConversation: 'Private conversation',
        loadingMessages: 'Loading messages...',
        noMessagesYet: 'No messages yet',
        noMessagesBody: 'Send the first private message to start the conversation.',
        signInInbox: 'Sign in to use private messages.',
        signInPeople: 'Sign in to discover people.',
        premiumMember: 'Premium member',
        freeMember: 'Free member',
        message: 'Message',
        unknown: 'Unknown',
        noMessagesSnippet: 'No messages yet',
        pickPersonFirst: 'Pick a person first.',
        deleteConversationConfirm: 'Delete this conversation for both sides?',
        conversationDeleted: 'Conversation deleted.',
        openInboxFirst: 'Sign in to open your inbox.',
        browsePeopleFirst: 'Sign in to browse people.',
        dbWaitingPeople: 'People search is waiting for the database connection.',
        dbWaitingInbox: 'Your inbox will appear once the database connection is ready.',
        dbWaitingMessages: 'Messages are temporarily unavailable until the database is connected.',
        invalidServerResponse: 'Invalid server response',
        requestFailed: 'Request failed',
        sendMessageError: 'Could not send private message.',
        deleteConversationError: 'Could not delete this conversation.',
        genericError: 'Something went wrong while loading messages.',
      },
      chat: {
        messageCommunity: 'Message the community...',
        chatTab: 'Chat',
        threadsTab: 'Threads',
        resourcesTab: 'Resources',
        member: 'member',
        members: 'members',
        online: 'online',
        addReaction: 'Add reaction',
        closeThread: 'Close thread',
        replyThreadPlaceholder: 'Reply in thread...',
        loadingThreads: 'Loading threads...',
        loadingMessagesError: 'Unable to load community messages',
        loadingThreadsError: 'Unable to load threads',
        loadingThreadMessagesError: 'Unable to load thread messages',
        newThread: 'New Thread',
        premiumThreadsOnly: 'Premium members can create threads',
        reply: 'reply',
        replies: 'replies',
        by: 'by',
        deleteThread: 'Delete thread',
        noThreads: 'No threads yet.',
        createOne: 'Create one.',
        noReplies: 'No replies yet. Start the discussion.',
        threadCreated: 'Thread "{title}" created!',
        threadDeleted: 'Thread deleted.',
        threadSubtitle: 'Start a focused discussion',
        threadTitleLabel: 'Thread title',
        threadTitlePlaceholder: 'What do you want to discuss?',
        threadTitleRequired: 'Please enter a thread title.',
        deleteThreadConfirm: 'Delete thread "{title}"? This cannot be undone.',
        createThreadError: 'Could not create thread',
        deleteThreadError: 'Could not delete thread',
        sendThreadError: 'Message could not be sent.',
        premiumFeature: 'Premium feature - upgrade to create threads',
        requestFailed: 'Request failed',
      },
      trends: {
        title: 'Trend Radar',
        subtitle: 'Know what to write before everyone else',
        nicheTitle: 'Trending in Your Niche',
        personalized: 'Personalized',
        emergingNow: 'Emerging Now',
        liveAnalysis: 'Live Analysis',
        trendEvolution: 'Trend evolution - last 7 weeks',
        contentIdeas: 'Content Ideas for This Trend',
        noTrendData: 'Trend data will appear here once real activity is available.',
        searches: '{count} searches',
        inYourNiche: 'In your niche',
        growth: '{count} growth',
        recommendation: 'Recommendation',
        recommendation1: 'Write from a real reporting angle or creator perspective.',
        recommendation2: 'Compare recent developments, audience demand, and competition.',
        recommendation3: 'Move quickly while this topic is still gaining traction.',
        write: 'Write',
        use: 'Use',
        ideaLoaded: 'Idea loaded in writer!',
        emerging: 'Emerging',
        peaking: 'Peaking',
        declining: 'Declining',
        fading: 'Fading',
      },
      analytics: {
        title: 'My Analytics',
        subtitle: 'Your real content performance from the database.',
        last12Weeks: 'Last 12 weeks',
        articlesPublished: 'Articles Published',
        totalViews: 'Total Views',
        totalLikes: 'Total Likes',
        commentsReceived: 'Comments Received',
        savedArticles: 'Saved Articles',
        audienceMomentum: 'Audience Momentum',
        audienceMomentumSub: 'Weekly views and likes across the last 12 weeks',
        weekly: 'Weekly',
        loadingChart: 'Loading chart...',
        noChartData: 'No chart data yet.',
        activityPulse: 'Activity Pulse',
        activityPulseSub: 'Publishing, comments, and saves over the last year',
        noActivityData: 'No activity data yet.',
        loadingActivity: 'Loading activity...',
        noRecentActivity: 'No recent activity yet.',
        recentHighlights: 'Recent highlights',
        topPerforming: 'Top Performing Articles',
        topPerformingSub: 'Sorted by views first, then likes',
        loadingArticles: 'Loading articles...',
        noPublishedArticles: 'No published articles yet.',
        views: 'Views',
        likes: 'Likes',
        activity: 'Activity',
        total: 'total',
        activityCount: '{date}: {count} activities',
        untitledArticle: 'Untitled article',
        general: 'General',
        justNow: 'Just now',
        more: 'More',
        less: 'Less',
      },
    },
    fr: {
      rightRail: {
        searchPlaceholder: 'Rechercher sur IBlog...',
        yourStats: 'Vos statistiques',
        articles: 'Articles',
        likes: 'Likes',
        comments: 'Commentaires',
        saved: 'Sauvegardes',
        trendingTopics: 'Sujets tendance',
        communities: 'Communautes',
        topAuthors: 'Top auteurs',
        loading: 'Chargement...',
        weeklyDigest: 'Digest hebdomadaire',
        stayInLoop: 'Restez informe',
        digestCopy: '5 meilleurs articles, selectionnes chaque semaine.',
        subscribe: 'S\'abonner',
        about: 'A propos',
        blog: 'Blog',
        privacy: 'Confidentialite',
        terms: 'Conditions',
        noDataYet: 'Aucune donnee pour le moment.',
        noTrendingTopics: 'Aucun sujet tendance pour le moment',
        noCommunitiesJoined: 'Aucune communaute rejointe.',
        likesUnit: 'likes',
        commentsUnit: 'commentaires',
        articlesUnit: 'art.',
        interactionsUnit: 'interactions',
        premium: 'Premium',
        message: 'Message',
        follow: 'Suivre',
        following: 'Suivi',
        enterChat: 'Entrer dans le chat',
        leave: 'Quitter',
        invalidEmail: 'Veuillez entrer un email valide',
        subscribed: 'Abonnement confirme. Digest hebdomadaire a venir.',
      },
      search: {
        title: 'Recherche',
        subtitle: 'Trouvez les meilleurs articles et auteurs a partir du contenu en direct.',
        placeholder: 'Rechercher des articles, categories, tags ou auteurs...',
        button: 'Rechercher',
        liveRanking: 'Classement en direct',
        articlesPeople: 'Articles et personnes',
        minLetters: 'Tapez au moins 2 lettres pour commencer.',
        all: 'Tout',
        articles: 'Articles',
        people: 'Personnes',
        startTitle: 'Commencez par un mot-cle',
        startBody: 'Essayez un titre, un sujet ou un nom d\'auteur.',
        emptyTitle: 'Aucun resultat',
        emptyBody: 'Essayez un autre mot-cle, une categorie ou un auteur.',
        resultsFor: '{count} resultats pour "{query}"',
        resultFor: '{count} resultat pour "{query}"',
        view: 'Voir',
        message: 'Message',
        profile: 'Profil',
        author: 'Auteur',
        open: 'Ouvrir',
        article: 'Article',
        byInRead: 'Par {author} dans {category} / {readTime}',
        views: 'Vues {count}',
        likes: 'Likes {count}',
        premiumSnippet: 'Membre premium publiant sur IBlog.',
        profileSnippet: 'Profil auteur IBlog.',
        match: 'Correspondance',
        exactMatch: 'Correspondance exacte',
        highPrecision: 'Tres precis',
        strongMatch: 'Correspondance forte',
        score: 'Score {score}',
        plan: 'offre {plan}',
        free: 'Gratuit',
        premium: 'Premium',
        untitledArticle: 'Article sans titre',
        unknown: 'Inconnu',
        general: 'General',
      },
      communities: {
        title: 'Espaces communautaires',
        subtitle: 'Communautes thematiques pour partager des connaissances en profondeur',
        create: 'Creer une communaute',
        modalTitle: 'Nouvelle communaute',
        modalSubtitle: 'Creez un espace cible pour votre audience',
        nameLabel: 'Nom de la communaute',
        namePlaceholder: 'ex. Discussion sur l\'ethique de l\'IA',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'Quels sujets cette communaute va-t-elle couvrir ?',
        topicsLabel: 'Sujets / Tags',
        topicsHint: 'separes par des virgules',
        topicsPlaceholder: 'ex. IA, Ethique, Politique',
        searchPlaceholder: 'Rechercher des communautes, sujets ou createurs...',
        clearAria: 'Effacer la recherche',
        loading: 'Chargement des communautes...',
        empty: 'Aucune communaute pour le moment. Soyez la premiere personne a en creer une.',
        emptyMatch: 'Aucune communaute ne correspond a "{query}"',
        member: 'membre',
        members: 'membres',
        openChat: 'Ouvrir le chat',
        leave: 'Quitter',
        join: 'Rejoindre',
        joining: 'Connexion...',
        leaving: 'Quitter...',
        signInJoin: 'Connectez-vous pour rejoindre',
        signInCreate: 'Veuillez vous connecter',
        joined: 'Communaute rejointe !',
        left: 'Communaute quittee',
        joinError: 'Impossible de rejoindre',
        leaveError: 'Impossible de quitter',
        createError: 'Impossible de creer la communaute',
        networkError: 'Erreur reseau',
        signInFirst: 'Connectez-vous d\'abord',
        chatLoading: 'Chargement du chat...',
        byCreator: 'par',
        premiumFeature: 'Fonction premium',
        nameRequired: 'Le nom est obligatoire',
        descriptionRequired: 'La description est obligatoire',
        creating: 'Creation...',
        created: '"{name}" a ete creee !',
      },
      notifications: {
        empty: 'Aucune notification pour le moment',
        unread: '{count} non lues',
        markAllRead: 'Tout marquer comme lu',
        allReadToast: 'Toutes les notifications ont ete marquees comme lues',
        welcomeBack: '<strong>IBlog</strong> : bon retour.',
        likedArticle: 'Vous avez aime <strong>{title}</strong>.',
        sharedArticle: 'Vous avez partage <strong>{title}</strong>.',
        commentedArticle: 'Nouveau commentaire sur <strong>{title}</strong>.',
        privateMessageSent: 'Nouveau message prive envoye a <strong>{name}</strong>.',
        communityMessage: 'Nouveau message dans <strong>{community}</strong> : {message}',
        justNow: 'A l\'instant',
      },
      messages: {
        privateMessaging: 'Messagerie privee',
        inbox: 'Boite de reception',
        sidebarCopy: 'Gardez les conversations claires, rapides et faciles a parcourir.',
        searchPlaceholder: 'Rechercher des personnes ou des conversations...',
        conversations: 'Conversations',
        conversationPeople: 'Participants',
        selectConversation: 'Selectionnez une conversation',
        selectConversationBody: 'Choisissez une personne depuis la boite de reception ou la liste pour commencer.',
        startDirectMessage: 'Demarrer un message direct',
        startDirectMessageBody: 'Utilisez la liste des participants pour demarrer une conversation privee au meme endroit.',
        pickConversationPlaceholder: 'Choisissez une conversation pour ecrire...',
        writeMessagePlaceholder: 'Ecrire un message prive...',
        sendShortcut: 'Appuyez sur Ctrl + Entree pour envoyer rapidement.',
        send: 'Envoyer',
        noMatchingConversations: 'Aucune conversation correspondante.',
        noPrivateConversations: 'Aucune conversation privee pour le moment.',
        noMatchingPeople: 'Aucune personne correspondante.',
        noConversationPeople: 'Aucun participant pour le moment. Lancez une conversation depuis un profil ou une recherche.',
        viewProfile: 'Voir le profil',
        deleteConversation: 'Supprimer la conversation',
        privateConversation: 'Conversation privee',
        loadingMessages: 'Chargement des messages...',
        noMessagesYet: 'Aucun message pour le moment',
        noMessagesBody: 'Envoyez le premier message prive pour lancer la conversation.',
        signInInbox: 'Connectez-vous pour utiliser les messages prives.',
        signInPeople: 'Connectez-vous pour decouvrir des personnes.',
        premiumMember: 'Membre premium',
        freeMember: 'Membre gratuit',
        message: 'Message',
        unknown: 'Inconnu',
        noMessagesSnippet: 'Aucun message pour le moment',
        pickPersonFirst: 'Choisissez d\'abord une personne.',
        deleteConversationConfirm: 'Supprimer cette conversation pour les deux personnes ?',
        conversationDeleted: 'Conversation supprimee.',
        openInboxFirst: 'Connectez-vous pour ouvrir votre boite de reception.',
        browsePeopleFirst: 'Connectez-vous pour parcourir les personnes.',
        dbWaitingPeople: 'La recherche de personnes attend la connexion a la base de donnees.',
        dbWaitingInbox: 'Votre boite de reception apparaitra une fois la base de donnees connectee.',
        dbWaitingMessages: 'Les messages sont temporairement indisponibles tant que la base n\'est pas connectee.',
        invalidServerResponse: 'Reponse du serveur invalide',
        requestFailed: 'La requete a echoue',
        sendMessageError: 'Impossible d envoyer le message prive.',
        deleteConversationError: 'Impossible de supprimer cette conversation.',
        genericError: 'Une erreur est survenue pendant le chargement des messages.',
      },
      chat: {
        messageCommunity: 'Ecrire a la communaute...',
        chatTab: 'Chat',
        threadsTab: 'Fils',
        resourcesTab: 'Ressources',
        member: 'membre',
        members: 'membres',
        online: 'en ligne',
        addReaction: 'Ajouter une reaction',
        closeThread: 'Fermer le fil',
        replyThreadPlaceholder: 'Repondre dans le fil...',
        loadingThreads: 'Chargement des fils...',
        loadingMessagesError: 'Impossible de charger les messages de la communaute',
        loadingThreadsError: 'Impossible de charger les fils',
        loadingThreadMessagesError: 'Impossible de charger les messages du fil',
        newThread: 'Nouveau fil',
        premiumThreadsOnly: 'Les membres premium peuvent creer des fils',
        reply: 'reponse',
        replies: 'reponses',
        by: 'par',
        deleteThread: 'Supprimer le fil',
        noThreads: 'Aucun fil pour le moment.',
        createOne: 'Creez-en un.',
        noReplies: 'Aucune reponse pour le moment. Lancez la discussion.',
        threadCreated: 'Le fil "{title}" a ete cree !',
        threadDeleted: 'Fil supprime.',
        threadSubtitle: 'Lancez une discussion ciblee',
        threadTitleLabel: 'Titre du fil',
        threadTitlePlaceholder: 'Quel sujet voulez-vous discuter ?',
        threadTitleRequired: 'Veuillez saisir un titre de fil.',
        deleteThreadConfirm: 'Supprimer le fil "{title}" ? Cette action est definitive.',
        createThreadError: 'Impossible de creer le fil',
        deleteThreadError: 'Impossible de supprimer le fil',
        sendThreadError: 'Le message n\'a pas pu etre envoye.',
        premiumFeature: 'Fonction premium - passez a Premium pour creer des fils',
        requestFailed: 'La requete a echoue',
      },
      trends: {
        title: 'Radar des tendances',
        subtitle: 'Sachez quoi ecrire avant tout le monde',
        nicheTitle: 'Tendance dans votre niche',
        personalized: 'Personnalise',
        emergingNow: 'En emergence',
        liveAnalysis: 'Analyse en direct',
        trendEvolution: 'Evolution de la tendance - 7 dernieres semaines',
        contentIdeas: 'Idees de contenu pour cette tendance',
        noTrendData: 'Les donnees de tendance apparaitront quand une activite reelle sera disponible.',
        searches: '{count} recherches',
        inYourNiche: 'Dans votre niche',
        growth: '{count} de croissance',
        recommendation: 'Recommandation',
        recommendation1: 'Ecrivez depuis un angle de reportage reel ou un point de vue createur.',
        recommendation2: 'Comparez les evolutions recentes, la demande d\'audience et la concurrence.',
        recommendation3: 'Allez vite tant que ce sujet prend encore de l\'ampleur.',
        write: 'Ecrire',
        use: 'Utiliser',
        ideaLoaded: 'Idee chargee dans l\'editeur !',
        emerging: 'Emergente',
        peaking: 'Au sommet',
        declining: 'En baisse',
        fading: 'En recul',
      },
      analytics: {
        title: 'Mes analyses',
        subtitle: 'Les performances reelles de votre contenu depuis la base de donnees.',
        last12Weeks: '12 dernieres semaines',
        articlesPublished: 'Articles publies',
        totalViews: 'Vues totales',
        totalLikes: 'Likes totaux',
        commentsReceived: 'Commentaires recus',
        savedArticles: 'Articles sauvegardes',
        audienceMomentum: 'Dynamique d\'audience',
        audienceMomentumSub: 'Vues et likes hebdomadaires sur les 12 dernieres semaines',
        weekly: 'Hebdomadaire',
        loadingChart: 'Chargement du graphique...',
        noChartData: 'Aucune donnee de graphique pour le moment.',
        activityPulse: 'Pulse d\'activite',
        activityPulseSub: 'Publications, commentaires et sauvegardes sur la derniere annee',
        noActivityData: 'Aucune donnee d\'activite pour le moment.',
        loadingActivity: 'Chargement de l\'activite...',
        noRecentActivity: 'Aucune activite recente.',
        recentHighlights: 'Faits recents',
        topPerforming: 'Articles les plus performants',
        topPerformingSub: 'Tries d\'abord par vues puis par likes',
        loadingArticles: 'Chargement des articles...',
        noPublishedArticles: 'Aucun article publie pour le moment.',
        views: 'Vues',
        likes: 'Likes',
        activity: 'Activite',
        total: 'total',
        activityCount: '{date} : {count} activites',
        untitledArticle: 'Article sans titre',
        general: 'General',
        justNow: 'A l\'instant',
        more: 'Plus',
        less: 'Moins',
      },
    },
    ar: {
      rightRail: { searchPlaceholder: 'ابحث في IBlog...', yourStats: 'إحصاءاتك', articles: 'المقالات', likes: 'الإعجابات', comments: 'التعليقات', saved: 'المحفوظات', trendingTopics: 'المواضيع الرائجة', communities: 'المجتمعات', topAuthors: 'أفضل الكتّاب', loading: 'جارٍ التحميل...', weeklyDigest: 'الملخص الأسبوعي', stayInLoop: 'ابقَ على اطلاع', digestCopy: 'أفضل 5 مقالات مختارة كل أسبوع.', subscribe: 'اشترك', about: 'حول', blog: 'المدونة', privacy: 'الخصوصية', terms: 'الشروط', noDataYet: 'لا توجد بيانات بعد.', noTrendingTopics: 'لا توجد مواضيع رائجة بعد', noCommunitiesJoined: 'لم تنضم إلى أي مجتمع بعد.', likesUnit: 'إعجاب', commentsUnit: 'تعليق', articlesUnit: 'مقال', interactionsUnit: 'تفاعل', premium: 'بريميوم', message: 'مراسلة', follow: 'متابعة', following: 'تتم المتابعة', enterChat: 'دخول الدردشة', leave: 'مغادرة', invalidEmail: 'يرجى إدخال بريد إلكتروني صالح', subscribed: 'تم الاشتراك. سيصلك الملخص الأسبوعي.' },
      search: { title: 'البحث', subtitle: 'اعثر على أفضل المقالات والكتّاب من محتوى المنصة المباشر.', placeholder: 'ابحث عن مقالات أو تصنيفات أو وسوم أو أسماء كتّاب...', button: 'بحث', liveRanking: 'ترتيب مباشر', articlesPeople: 'مقالات وأشخاص', minLetters: 'اكتب حرفين على الأقل للبدء.', all: 'الكل', articles: 'المقالات', people: 'الأشخاص', startTitle: 'ابدأ بكلمة مفتاحية', startBody: 'جرّب عنوان مقال أو موضوعًا أو اسم كاتب.', emptyTitle: 'لا توجد نتائج', emptyBody: 'جرّب كلمة أخرى أو تصنيفًا أو اسم كاتب.', resultsFor: '{count} نتائج لـ "{query}"', resultFor: '{count} نتيجة لـ "{query}"', view: 'عرض', message: 'مراسلة', profile: 'الملف الشخصي', author: 'الكاتب', open: 'فتح', article: 'مقال', byInRead: 'بواسطة {author} في {category} / {readTime}', views: 'المشاهدات {count}', likes: 'الإعجابات {count}', premiumSnippet: 'عضو بريميوم ينشر على IBlog.', profileSnippet: 'ملف كاتب على IBlog.', match: 'تطابق', exactMatch: 'تطابق تام', highPrecision: 'دقة عالية', strongMatch: 'تطابق قوي', score: 'النتيجة {score}', plan: 'خطة {plan}', unknown: 'غير معروف', general: 'عام' },
      communities: { title: 'مساحات المجتمع', subtitle: 'مجتمعات موضوعية لمشاركة المعرفة بعمق', create: 'إنشاء مجتمع', searchPlaceholder: 'ابحث عن مجتمعات أو مواضيع أو منشئين...', clearAria: 'مسح البحث', loading: 'جارٍ تحميل المجتمعات...', empty: 'لا توجد مجتمعات بعد. كن أول من ينشئ واحدًا.', emptyMatch: 'لا توجد مجتمعات تطابق "{query}"', member: 'عضو', members: 'أعضاء', openChat: 'فتح الدردشة', leave: 'مغادرة', join: 'انضمام', joining: 'جارٍ الانضمام...', leaving: 'جارٍ المغادرة...', signInJoin: 'سجّل الدخول للانضمام', joined: 'تم الانضمام!', left: 'تمت مغادرة المجتمع', joinError: 'تعذر الانضمام', leaveError: 'تعذر المغادرة', networkError: 'خطأ في الشبكة', signInFirst: 'سجّل الدخول أولاً', chatLoading: 'جارٍ تحميل الدردشة...', byCreator: 'بواسطة' },
      trends: { title: 'رادار الاتجاهات', subtitle: 'اعرف ماذا تكتب قبل الجميع', nicheTitle: 'الرائج في مجالك', personalized: 'مخصص', emergingNow: 'يظهر الآن', liveAnalysis: 'تحليل مباشر', trendEvolution: 'تطور الاتجاه - آخر 7 أسابيع', contentIdeas: 'أفكار محتوى لهذا الاتجاه', noTrendData: 'ستظهر بيانات الاتجاهات هنا عند توفر نشاط حقيقي.', searches: '{count} عمليات بحث', emerging: 'صاعد', peaking: 'في الذروة', declining: 'متراجع', fading: 'يتلاشى' },
      analytics: { title: 'تحليلاتي', subtitle: 'أداء محتواك الحقيقي من قاعدة البيانات.', last12Weeks: 'آخر 12 أسبوعًا', articlesPublished: 'المقالات المنشورة', totalViews: 'إجمالي المشاهدات', totalLikes: 'إجمالي الإعجابات', commentsReceived: 'التعليقات المستلمة', savedArticles: 'المقالات المحفوظة', audienceMomentum: 'زخم الجمهور', audienceMomentumSub: 'المشاهدات والإعجابات الأسبوعية خلال آخر 12 أسبوعًا', weekly: 'أسبوعي', loadingChart: 'جارٍ تحميل المخطط...', noChartData: 'لا توجد بيانات للمخطط بعد.', activityPulse: 'نبض النشاط', activityPulseSub: 'النشر والتعليقات والحفظ خلال السنة الماضية', noActivityData: 'لا توجد بيانات نشاط بعد.', noRecentActivity: 'لا يوجد نشاط حديث.', recentHighlights: 'أحدث النقاط', topPerforming: 'أفضل المقالات أداءً', topPerformingSub: 'مرتبة أولاً بالمشاهدات ثم بالإعجابات', loadingArticles: 'جارٍ تحميل المقالات...', noPublishedArticles: 'لا توجد مقالات منشورة بعد.', views: 'المشاهدات', likes: 'الإعجابات', activity: 'نشاط', justNow: 'الآن', more: 'أكثر', less: 'أقل' },
    },
    de: {
      rightRail: { searchPlaceholder: 'IBlog durchsuchen...', yourStats: 'Deine Statistiken', articles: 'Artikel', likes: 'Likes', comments: 'Kommentare', saved: 'Gespeichert', trendingTopics: 'Trendthemen', communities: 'Communitys', topAuthors: 'Top-Autoren', loading: 'Wird geladen...', weeklyDigest: 'Wochenrueckblick', stayInLoop: 'Bleib auf dem Laufenden', digestCopy: '5 beste Artikel, jede Woche kuratiert.', subscribe: 'Abonnieren', about: 'Ueber uns', blog: 'Blog', privacy: 'Datenschutz', terms: 'Bedingungen', noDataYet: 'Noch keine Daten.', noTrendingTopics: 'Noch keine Trendthemen', noCommunitiesJoined: 'Noch keiner Community beigetreten.', likesUnit: 'Likes', commentsUnit: 'Kommentare', articlesUnit: 'Art.', interactionsUnit: 'Interaktionen', premium: 'Premium', message: 'Nachricht', follow: 'Folgen', following: 'Gefolgt', enterChat: 'Chat betreten', leave: 'Verlassen', invalidEmail: 'Bitte gib eine gueltige E-Mail ein', subscribed: 'Abonniert. Der Wochenrueckblick kommt.' },
      search: { title: 'Suche', subtitle: 'Finde die besten Artikel- und Autoren-Treffer aus Live-Inhalten.', placeholder: 'Suche nach Artikeln, Kategorien, Tags oder Autorennamen...', button: 'Suchen', liveRanking: 'Live-Ranking', articlesPeople: 'Artikel und Personen', minLetters: 'Gib mindestens 2 Buchstaben ein.', all: 'Alle', articles: 'Artikel', people: 'Personen', startTitle: 'Starte mit einem Stichwort', startBody: 'Versuche einen Artikeltitel, ein Thema oder einen Autorennamen.', emptyTitle: 'Keine Ergebnisse', emptyBody: 'Versuche ein anderes Stichwort, eine Kategorie oder einen Autor.', resultsFor: '{count} Ergebnisse fuer "{query}"', resultFor: '{count} Ergebnis fuer "{query}"', view: 'Ansehen', message: 'Nachricht', profile: 'Profil', author: 'Autor', open: 'Oeffnen', article: 'Artikel', byInRead: 'Von {author} in {category} / {readTime}', views: 'Aufrufe {count}', likes: 'Likes {count}', premiumSnippet: 'Premium-Mitglied auf IBlog.', profileSnippet: 'IBlog-Autorenprofil.', match: 'Treffer', exactMatch: 'Exakter Treffer', highPrecision: 'Hohe Praezision', strongMatch: 'Starker Treffer', score: 'Wert {score}', plan: '{plan}-Plan', unknown: 'Unbekannt', general: 'Allgemein' },
      communities: { title: 'Community-Bereiche', subtitle: 'Themenbasierte Communitys fuer tiefen Wissensaustausch', create: 'Community erstellen', modalTitle: 'Neue Community', modalSubtitle: 'Baue einen fokussierten Raum fuer dein Publikum auf', nameLabel: 'Community-Name', namePlaceholder: 'z. B. Diskussion ueber KI-Ethik', descriptionLabel: 'Beschreibung', descriptionPlaceholder: 'Welche Themen deckt diese Community ab?', topicsLabel: 'Themen / Tags', topicsHint: 'durch Kommas getrennt', topicsPlaceholder: 'z. B. KI, Ethik, Politik', searchPlaceholder: 'Communitys, Themen oder Creator suchen...', clearAria: 'Suche loeschen', loading: 'Communitys werden geladen...', empty: 'Noch keine Communitys. Sei die erste Person, die eine erstellt.', emptyMatch: 'Keine Community passt zu "{query}"', member: 'Mitglied', members: 'Mitglieder', openChat: 'Chat oeffnen', leave: 'Verlassen', join: 'Community beitreten', joining: 'Trete bei...', leaving: 'Verlasse...', signInJoin: 'Zum Beitreten anmelden', signInCreate: 'Bitte melde dich an', joined: 'Beigetreten!', left: 'Community verlassen', joinError: 'Beitritt fehlgeschlagen', leaveError: 'Verlassen fehlgeschlagen', createError: 'Community konnte nicht erstellt werden', networkError: 'Netzwerkfehler', signInFirst: 'Bitte zuerst anmelden', chatLoading: 'Chat laedt...', byCreator: 'von', premiumFeature: 'Premium-Funktion', nameRequired: 'Name ist erforderlich', descriptionRequired: 'Beschreibung ist erforderlich', creating: 'Wird erstellt...', created: '"{name}" wurde erstellt!' },
      trends: { title: 'Trend-Radar', subtitle: 'Wisse frueher als andere, worueber du schreiben solltest', nicheTitle: 'Trend in deiner Nische', personalized: 'Personalisiert', emergingNow: 'Jetzt im Kommen', liveAnalysis: 'Live-Analyse', trendEvolution: 'Trendentwicklung - letzte 7 Wochen', contentIdeas: 'Content-Ideen fuer diesen Trend', noTrendData: 'Trenddaten erscheinen hier, sobald echte Aktivitaet vorhanden ist.', searches: '{count} Suchen', inYourNiche: 'In deiner Nische', growth: '{count} Wachstum', recommendation: 'Empfehlung', recommendation1: 'Schreibe aus einem echten Reporting-Winkel oder aus Creator-Perspektive.', recommendation2: 'Vergleiche aktuelle Entwicklungen, Publikumsnachfrage und Wettbewerb.', recommendation3: 'Handle schnell, solange dieses Thema noch an Fahrt gewinnt.', write: 'Schreiben', use: 'Nutzen', ideaLoaded: 'Idee im Editor geladen!', emerging: 'Aufkommend', peaking: 'Auf dem Hoehepunkt', declining: 'Ruecklaeufig', fading: 'Verblasst' },
      analytics: { title: 'Meine Analysen', subtitle: 'Die echte Performance deiner Inhalte aus der Datenbank.', last12Weeks: 'Letzte 12 Wochen', articlesPublished: 'Veroeffentlichte Artikel', totalViews: 'Gesamtaufrufe', totalLikes: 'Gesamtlikes', commentsReceived: 'Erhaltene Kommentare', savedArticles: 'Gespeicherte Artikel', audienceMomentum: 'Publikumsdynamik', audienceMomentumSub: 'Woechentliche Aufrufe und Likes ueber die letzten 12 Wochen', weekly: 'Woechentlich', loadingChart: 'Diagramm wird geladen...', noChartData: 'Noch keine Diagrammdaten.', activityPulse: 'Aktivitaetspuls', activityPulseSub: 'Veroeffentlichungen, Kommentare und Speicherungen im letzten Jahr', noActivityData: 'Noch keine Aktivitaetsdaten.', loadingActivity: 'Aktivitaet wird geladen...', noRecentActivity: 'Keine aktuelle Aktivitaet.', recentHighlights: 'Neueste Highlights', topPerforming: 'Top-Artikel', topPerformingSub: 'Nach Aufrufen, dann Likes sortiert', loadingArticles: 'Artikel werden geladen...', noPublishedArticles: 'Noch keine veroeffentlichten Artikel.', views: 'Aufrufe', likes: 'Likes', activity: 'Aktivitaet', total: 'gesamt', activityCount: '{date}: {count} Aktivitaeten', untitledArticle: 'Unbenannter Artikel', general: 'Allgemein', justNow: 'Gerade eben', more: 'Mehr', less: 'Weniger' },
    },
    ja: {
      rightRail: { searchPlaceholder: 'IBlogを検索...', yourStats: 'あなたの統計', articles: '記事', likes: 'いいね', comments: 'コメント', saved: '保存済み', trendingTopics: '注目トピック', communities: 'コミュニティ', topAuthors: '人気著者', loading: '読み込み中...', weeklyDigest: '週間ダイジェスト', stayInLoop: '最新情報を受け取る', digestCopy: '毎週厳選した5本の記事をお届けします。', subscribe: '登録', about: '概要', blog: 'ブログ', privacy: 'プライバシー', terms: '利用規約', noDataYet: 'まだデータがありません。', noTrendingTopics: 'まだ注目トピックはありません', noCommunitiesJoined: 'まだ参加したコミュニティはありません。', likesUnit: 'いいね', commentsUnit: 'コメント', articlesUnit: '記事', interactionsUnit: '反応', premium: 'プレミアム', message: 'メッセージ', follow: 'フォロー', following: 'フォロー中', enterChat: 'チャットへ', leave: '退出', invalidEmail: '有効なメールアドレスを入力してください', subscribed: '登録しました。週間ダイジェストをお届けします。' },
      search: { title: '検索', subtitle: 'ライブコンテンツから記事と著者の最適な一致を見つけます。', placeholder: '記事、カテゴリ、タグ、著者名を検索...', button: '検索', liveRanking: 'ライブ順位', articlesPeople: '記事と人', minLetters: '2文字以上入力してください。', all: 'すべて', articles: '記事', people: '人', startTitle: 'キーワードから始めましょう', startBody: '記事タイトル、トピック、著者名を試してください。', emptyTitle: '結果がありません', emptyBody: '別のキーワード、カテゴリ、著者名を試してください。', resultsFor: '"{query}" の結果 {count} 件', resultFor: '"{query}" の結果 {count} 件', view: '表示', message: 'メッセージ', profile: 'プロフィール', author: '著者', open: '開く', article: '記事', byInRead: '{author} / {category} / {readTime}', views: '表示 {count}', likes: 'いいね {count}', premiumSnippet: 'IBlogで執筆するプレミアム会員です。', profileSnippet: 'IBlog著者プロフィール。', match: '一致', exactMatch: '完全一致', highPrecision: '高精度', strongMatch: '強い一致', score: 'スコア {score}', plan: '{plan} プラン', unknown: '不明', general: '一般' },
      communities: { title: 'コミュニティスペース', subtitle: '深い知識共有のためのトピック別コミュニティ', create: 'コミュニティを作成', searchPlaceholder: 'コミュニティ、トピック、作成者を検索...', clearAria: '検索をクリア', loading: 'コミュニティを読み込み中...', empty: 'まだコミュニティがありません。最初に作成しましょう。', emptyMatch: '"{query}" に一致するコミュニティはありません', member: 'メンバー', members: 'メンバー', openChat: 'チャットを開く', leave: '退出', join: '参加する', joining: '参加中...', leaving: '退出中...', signInJoin: '参加するにはサインインしてください', joined: '参加しました！', left: 'コミュニティを退出しました', joinError: '参加できませんでした', leaveError: '退出できませんでした', networkError: 'ネットワークエラー', signInFirst: '先にサインインしてください', chatLoading: 'チャットを読み込み中...', byCreator: '作成者' },
      trends: { title: 'トレンドレーダー', subtitle: '他の人より早く何を書くべきかを知る', nicheTitle: 'あなたの分野のトレンド', personalized: 'パーソナライズ', emergingNow: '急上昇中', liveAnalysis: 'ライブ分析', trendEvolution: 'トレンド推移 - 過去7週間', contentIdeas: 'このトレンド向けのコンテンツ案', noTrendData: '実際の活動が集まるとトレンドデータがここに表示されます。', searches: '{count} 検索', emerging: '新興', peaking: 'ピーク', declining: '下降中', fading: '減衰中' },
      analytics: { title: 'マイ分析', subtitle: 'データベースから見た実際のコンテンツ成果です。', last12Weeks: '過去12週間', articlesPublished: '公開記事数', totalViews: '総閲覧数', totalLikes: '総いいね数', commentsReceived: '受け取ったコメント', savedArticles: '保存された記事', audienceMomentum: 'オーディエンスの勢い', audienceMomentumSub: '過去12週間の週次ビューといいね', weekly: '週間', loadingChart: 'グラフを読み込み中...', noChartData: 'まだグラフデータがありません。', activityPulse: '活動パルス', activityPulseSub: '過去1年間の投稿、コメント、保存', noActivityData: 'まだ活動データがありません。', noRecentActivity: '最近の活動はありません。', recentHighlights: '最近のハイライト', topPerforming: '人気記事', topPerformingSub: '閲覧数優先、その後いいね順', loadingArticles: '記事を読み込み中...', noPublishedArticles: 'まだ公開済み記事がありません。', views: '閲覧', likes: 'いいね', activity: '活動', justNow: 'たった今', more: '多い', less: '少ない' },
    },
    es: {
      nav: { home: 'Inicio', features: 'Funciones', howItWorks: 'Como funciona', pricing: 'Precios', stories: 'Historias', premium: 'Premium', signIn: 'Entrar', getStarted: 'Empezar', theme: 'Cambiar tema' },
      hero: { kicker: 'Impulsado por la curiosidad', title: 'Una sala de lectura azul para <em>ideas que viajan</em>.', description: 'Escribe, descubre y conversa en un solo lugar con una identidad visual mas fuerte.', primary: 'Empezar a escribir', secondary: 'Explorar posts' },
      leftRail: { freeMember: 'Miembro gratuito', premiumMember: 'Miembro premium', main: 'Principal', dashboard: 'Panel', account: 'Cuenta', home: 'Inicio', notifications: 'Notificaciones', messages: 'Mensajes', saved: 'Guardados', globalMap: 'Mapa global', myArticles: 'Mis articulos', analytics: 'Analitica', communities: 'Comunidades', trends: 'Radar de tendencias', settings: 'Ajustes', signOut: 'Cerrar sesion', light: 'Claro', dark: 'Oscuro', language: 'Idioma', languageHint: 'Cambia una vez y toda la experiencia principal sigue.' },
      settings: { title: 'Ajustes', subtitle: 'Gestiona tu cuenta y tus preferencias', account: 'Cuenta', displayName: 'Nombre visible', emailAddress: 'Correo', bio: 'Bio', saveChanges: 'Guardar cambios', languageTitle: 'Idioma de la interfaz', languageBody: 'Aplica el idioma a la pagina inicial, al feed y a la experiencia principal.', namePlaceholder: 'Tu nombre', emailPlaceholder: 'tu@email.com', bioPlaceholder: 'Cuenta tu historia...', premiumPlan: 'Plan premium', freePlan: 'Estas en el plan gratuito.', premiumPlanActive: 'Estas en el plan premium.', notifications: 'Notificaciones', newFollowers: 'Nuevos seguidores', articleLikes: 'Me gusta en articulos', weeklyDigest: 'Resumen semanal' },
      feed: { curated: 'Seleccionado para tu feed', curatedNote: 'Eleccion editorial', listenPodcast: 'Escuchar como podcast', premiumArticle: 'Articulo premium', highQuality: 'Alta calidad', goodQuality: 'Bueno' },
      writer: { title: 'Escribir un articulo', subtitle: 'Comparte tu conocimiento con la comunidad de IBlog', edit: 'Editar', preview: 'Vista previa', templates: 'Plantillas', templateLocked: 'Disenos profesionales para escribir con estructura.', unlockTemplates: 'Mejorar para desbloquear', articleTitle: 'Tu titulo...', articleBody: 'Empieza a escribir...', selectCategory: 'Selecciona una categoria', tags: 'Etiquetas: IA, producto...', quality: 'Calidad del articulo', readability: 'Legibilidad', depth: 'Profundidad', structure: 'Estructura', engagement: 'Interaccion' },
      misc: { readArticle: 'Leer articulo', featured: 'Destacado', trendingWeek: 'Tendencias de la semana', about: 'Acerca de', privacy: 'Privacidad', terms: 'Terminos' },
    },
    it: {
      nav: { home: 'Home', features: 'Funzioni', howItWorks: 'Come funziona', pricing: 'Prezzi', stories: 'Storie', premium: 'Premium', signIn: 'Accedi', getStarted: 'Inizia', theme: 'Cambia tema' },
      hero: { kicker: 'Guidato dalla curiosita', title: 'Una sala di lettura blu per <em>idee che viaggiano</em>.', description: 'Scrivi, scopri e discuti in un unico spazio con un look piu forte.', primary: 'Inizia a scrivere', secondary: 'Esplora i post' },
      leftRail: { freeMember: 'Membro gratuito', premiumMember: 'Membro premium', main: 'Principale', dashboard: 'Dashboard', account: 'Account', home: 'Home', notifications: 'Notifiche', messages: 'Messaggi', saved: 'Salvati', globalMap: 'Mappa globale', myArticles: 'I miei articoli', analytics: 'Analisi', communities: 'Community', trends: 'Radar trend', settings: 'Impostazioni', signOut: 'Esci', light: 'Chiaro', dark: 'Scuro', language: 'Lingua', languageHint: 'Cambia una volta e l esperienza principale segue.' },
      settings: { title: 'Impostazioni', subtitle: 'Gestisci il tuo account e le preferenze', account: 'Account', displayName: 'Nome visibile', emailAddress: 'Email', bio: 'Bio', saveChanges: 'Salva modifiche', languageTitle: 'Lingua di visualizzazione', languageBody: 'Applica la lingua alla landing page, al feed e all interfaccia principale.', namePlaceholder: 'Il tuo nome', emailPlaceholder: 'tu@email.com', bioPlaceholder: 'Racconta la tua storia...', premiumPlan: 'Piano premium', freePlan: 'Sei nel piano gratuito.', premiumPlanActive: 'Sei nel piano premium.', notifications: 'Notifiche', newFollowers: 'Nuovi follower', articleLikes: 'Mi piace agli articoli', weeklyDigest: 'Riepilogo settimanale' },
      feed: { curated: 'Curato per il tuo feed', curatedNote: 'Scelta editoriale', listenPodcast: 'Ascolta come podcast', premiumArticle: 'Articolo premium', highQuality: 'Alta qualita', goodQuality: 'Buono' },
      writer: { title: 'Scrivi un articolo', subtitle: 'Condividi le tue idee con la community di IBlog', edit: 'Modifica', preview: 'Anteprima', templates: 'Template', templateLocked: 'Layout professionali per scrivere con struttura.', unlockTemplates: 'Sblocca con Premium', articleTitle: 'Titolo del tuo articolo...', articleBody: 'Inizia a scrivere...', selectCategory: 'Seleziona una categoria', tags: 'Tag: AI, design...', quality: 'Qualita dell articolo', readability: 'Leggibilita', depth: 'Profondita', structure: 'Struttura', engagement: 'Coinvolgimento' },
      misc: { readArticle: 'Leggi articolo', featured: 'In evidenza', trendingWeek: 'Trend della settimana', about: 'Info', privacy: 'Privacy', terms: 'Termini' },
    },
    pt: {
      nav: { home: 'Inicio', features: 'Funcionalidades', howItWorks: 'Como funciona', pricing: 'Precos', stories: 'Historias', premium: 'Premium', signIn: 'Entrar', getStarted: 'Comecar', theme: 'Mudar tema' },
      hero: { kicker: 'Movido pela curiosidade', title: 'Uma sala de leitura azul para <em>ideias que viajam</em>.', description: 'Escreva, descubra e converse num unico lugar com uma identidade mais clara.', primary: 'Comecar a escrever', secondary: 'Explorar posts' },
      leftRail: { freeMember: 'Membro gratuito', premiumMember: 'Membro premium', main: 'Principal', dashboard: 'Painel', account: 'Conta', home: 'Inicio', notifications: 'Notificacoes', messages: 'Mensagens', saved: 'Guardados', globalMap: 'Mapa global', myArticles: 'Meus artigos', analytics: 'Analises', communities: 'Comunidades', trends: 'Radar de tendencias', settings: 'Definicoes', signOut: 'Terminar sessao', light: 'Claro', dark: 'Escuro', language: 'Idioma', languageHint: 'Muda uma vez e a experiencia principal acompanha.' },
      settings: { title: 'Definicoes', subtitle: 'Gere a tua conta e preferencias', account: 'Conta', displayName: 'Nome visivel', emailAddress: 'Email', bio: 'Bio', saveChanges: 'Guardar alteracoes', languageTitle: 'Idioma de exibicao', languageBody: 'Aplica o idioma a landing page, ao feed e a interface principal.', namePlaceholder: 'O teu nome', emailPlaceholder: 'tu@email.com', bioPlaceholder: 'Conta a tua historia...', premiumPlan: 'Plano premium', freePlan: 'Estas no plano gratuito.', premiumPlanActive: 'Estas no plano premium.', notifications: 'Notificacoes', newFollowers: 'Novos seguidores', articleLikes: 'Gostos nos artigos', weeklyDigest: 'Resumo semanal' },
      feed: { curated: 'Curado para o teu feed', curatedNote: 'Escolha editorial', listenPodcast: 'Ouvir como podcast', premiumArticle: 'Artigo premium', highQuality: 'Alta qualidade', goodQuality: 'Bom' },
      writer: { title: 'Escrever artigo', subtitle: 'Partilha o teu conhecimento com a comunidade IBlog', edit: 'Editar', preview: 'Previsualizar', templates: 'Modelos', templateLocked: 'Modelos profissionais para escrever com estrutura.', unlockTemplates: 'Fazer upgrade', articleTitle: 'Titulo do teu artigo...', articleBody: 'Comeca a escrever...', selectCategory: 'Seleciona uma categoria', tags: 'Etiquetas: IA, ciencia...', quality: 'Qualidade do artigo', readability: 'Legibilidade', depth: 'Profundidade', structure: 'Estrutura', engagement: 'Envolvimento' },
      misc: { readArticle: 'Ler artigo', featured: 'Destaque', trendingWeek: 'Tendencias da semana', about: 'Sobre', privacy: 'Privacidade', terms: 'Termos' },
    },
  };

  function _mergeLocaleSections(target, source) {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = target[key] && typeof target[key] === 'object' ? target[key] : {};
        _mergeLocaleSections(target[key], value);
      } else {
        target[key] = value;
      }
    });
  }

  Object.entries(EXTRA_UI).forEach(([locale, sections]) => {
    UI[locale] = UI[locale] || {};
    _mergeLocaleSections(UI[locale], sections);
  });

  let currentLocale = _readLocale();

  function _readLocale() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED[stored] ? stored : DEFAULT_LOCALE;
  }

  function meta(locale = currentLocale) {
    return SUPPORTED[locale] || SUPPORTED[DEFAULT_LOCALE];
  }

  function getLocale() {
    return currentLocale;
  }

  function isRTL(locale = currentLocale) {
    return meta(locale).dir === 'rtl';
  }

  function _lookupKey(locale, key) {
    return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), UI[locale]);
  }

  function t(key, vars = {}, locale = currentLocale) {
    const template = _lookupKey(locale, key) ?? _lookupKey(DEFAULT_LOCALE, key) ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
  }

  function languageOptionsMarkup() {
    return Object.entries(SUPPORTED)
      .map(([value, info]) => `<option value="${value}">${info.label}</option>`)
      .join('');
  }

  function localizeCategory(value) {
    return CATEGORY_MAP[currentLocale]?.[value] || value;
  }

  function localizeTopic(value) {
    return TOPIC_MAP[currentLocale]?.[value] || value;
  }

  function localizeReadTime(value) {
    const match = String(value || '').match(/(\d+)\s*min/i);
    if (!match) return value;
    return t('misc.read', { count: match[1] });
  }

  function formatDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(meta().locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(parsed);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(meta().locale).format(Number(value || 0));
  }

  function localizeArticle(article) {
    if (!article || typeof article !== 'object') return article;
    if (currentLocale === DEFAULT_LOCALE) {
      return {
        ...article,
        readTime: localizeReadTime(article.readTime),
      };
    }

    const translated = ARTICLE_TRANSLATIONS[currentLocale]?.[article.id] || {};
    const localized = { ...article, ...translated };
    const category = translated.category || translated.cat || localizeCategory(article.category || article.cat || '');
    if (category) {
      localized.category = category;
      localized.cat = category;
    }
    localized.tags = Array.isArray(translated.tags)
      ? translated.tags
      : Array.isArray(article.tags)
      ? article.tags.map(localizeCategory)
      : article.tags;
    localized.readTime = localizeReadTime(article.readTime);
    localized.date = formatDate(article.date);
    return localized;
  }

  function _applyRoot() {
    const info = meta();
    document.documentElement.lang = info.htmlLang;
    document.documentElement.dir = info.dir;
    document.body.classList.toggle('is-rtl', info.dir === 'rtl');
  }

  function _text(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function _html(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = value;
  }

  function _applyStaticText() {
    _applyRoot();
    document.title = t('meta.title');

    document.querySelectorAll('.iblog-language-select').forEach((select) => {
      select.innerHTML = languageOptionsMarkup();
      select.value = currentLocale;
      if (!select.dataset.bound) {
        select.addEventListener('change', (event) => setLocale(event.target.value));
        select.dataset.bound = '1';
      }
    });

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n'));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });

    _text('#view-map .view-header h1', t('map.title'));
    _text('#view-map .view-header p', t('map.subtitle'));
    _text('#view-map .badge-premium', t('map.premiumFeature'));
    _html('#map-premium-overlay h3', t('map.premiumFeature'));
    _text('#map-premium-overlay p', t('map.premiumBody'));
    _text('#view-home .load-more-btn', t('actions.loadMore'));
    _text('#view-articles .view-header h1', t('leftRail.myArticles'));
    _text('#view-settings .view-header h1', t('settings.title'));
    _text('#view-settings .view-header p', t('settings.subtitle'));
    _text('#view-write .view-header h1', t('writer.title'));
    _text('#view-write .view-header p', t('writer.subtitle'));
    _text('#wtr-edit-label', t('writer.edit'));
    _text('#wtr-preview-label', t('writer.preview'));
    _text('#writer-templates-title', t('writer.templates'));
    _text('#writer-premium-templates-title', t('writer.templates'));
    _text('#template-subtitle', t('writer.templateLocked'));
    _text('#writer-upgrade-unlock-label', t('writer.unlockTemplates'));
    _text('#article-title-label', t('writer.articleTitle'));
    _text('#quality-title', t('writer.quality'));
    _text('#quality-read-label', t('writer.readability'));
    _text('#quality-depth-label', t('writer.depth'));
    _text('#quality-struct-label', t('writer.structure'));
    _text('#quality-eng-label', t('writer.engagement'));
    _text('#view-notifications .view-header h1', t('leftRail.notifications'));
    _text('#view-messages .view-header h1', t('leftRail.messages'));
    _text('#view-saved .view-header h1', t('leftRail.saved'));
    _text('#premium-settings-btn', t((IBlog.state.currentUser?.plan === 'premium' || IBlog.state.currentUser?.isPremium) ? 'actions.active' : 'actions.upgrade'));
    _text('#premium-status-text', t((IBlog.state.currentUser?.plan === 'premium' || IBlog.state.currentUser?.isPremium) ? 'settings.premiumPlanActive' : 'settings.freePlan'));
    const articleTitle = document.getElementById('article-title');
    const articleEditor = document.getElementById('article-editor');
    const articleEditorRich = document.getElementById('article-editor-rich');
    const articleTags = document.getElementById('article-tags');
    const settingsLanguageSelect = document.getElementById('settings-language-select');
    if (articleTitle) articleTitle.placeholder = t('writer.articleTitle');
    if (articleEditor) articleEditor.placeholder = t('writer.articleBody');
    if (articleEditorRich) articleEditorRich.setAttribute('data-placeholder', t('writer.articleBody'));
    if (articleTags) articleTags.placeholder = t('writer.tags');
    if (settingsLanguageSelect) settingsLanguageSelect.setAttribute('aria-label', t('settings.languageTitle'));
  }

  function _safeRun(label, task) {
    if (typeof task !== 'function') return;
    try {
      task();
    } catch (error) {
      console.warn(`I18n refresh skipped ${label}:`, error);
    }
  }

  function refresh() {
    _applyRoot();

    _safeRun('landing nav', () => IBlog.LandingNav?.init?.());
    _safeRun('hero', () => IBlog.Hero?.init?.());
    _safeRun('features', () => IBlog.Features?.init?.());
    _safeRun('carousel', () => IBlog.Carousel?.init?.());
    _safeRun('footer', () => IBlog.Footer?.init?.());

    if (document.getElementById('dashboard')?.style.display !== 'none') {
      _safeRun('left rail', () => IBlog.LeftRail?.init?.());
      _safeRun('search', () => IBlog.Search?.init?.());
      _safeRun('writer category select', () => IBlog.Views?.buildCategorySelect?.());
      _safeRun('my articles view', () => IBlog.Views?.buildMyArticles?.());
      _safeRun('saved view', () => IBlog.Views?.buildSaved?.());
      _safeRun('messages view', () => IBlog.Views?.buildMessages?.());
      _safeRun('communities', () => IBlog.Communities?.init?.());
      _safeRun('trend radar', () => IBlog.Trends?.init?.());
      _safeRun('analytics', () => IBlog.Analytics?.init?.());
      _safeRun('notifications', () => IBlog.Notifications?.init?.());
      _safeRun('profile', () => IBlog.Profile?.renderCurrentView?.());
      _safeRun('right rail', () => {
        if (typeof initRightRail === 'function') initRightRail();
      });
      const activeFeed = String(document.querySelector('.feed-tab.active')?.dataset?.feedTab || document.querySelector('.feed-tab.active')?.textContent || 'recommended')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
      _safeRun('feed', () => {
        IBlog.Feed?.build?.(['recommended', 'following', 'latest'].includes(activeFeed) ? activeFeed : 'recommended');
      });
    }

    _safeRun('dashboard ticker', () => IBlog.Dashboard?.buildTicker?.());
    _applyStaticText();
    window.dispatchEvent(new CustomEvent('iblog:locale-changed', { detail: { locale: currentLocale, dir: meta().dir } }));
  }

  function setLocale(locale) {
    if (!SUPPORTED[locale]) return;
    currentLocale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    refresh();
  }

  function init() {
    _applyRoot();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.setTimeout(_applyStaticText, 0);
      });
    } else {
      _applyStaticText();
    }
  }

  return {
    init,
    t,
    meta,
    getLocale,
    isRTL,
    setLocale,
    refresh,
    formatDate,
    formatNumber,
    localizeArticle,
    localizeCategory,
    localizeTopic,
    localizeReadTime,
    languageOptionsMarkup,
  };
})();

IBlog.I18n.init();
