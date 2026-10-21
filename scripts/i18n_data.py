# English source string -> (Italian, French, German).
# Keys are the whitespace-collapsed text of one text node or one meta attribute.
# Proper names, product names, domains, paper titles and article titles stay as they are.
T = {
# ---- shared chrome -------------------------------------------------------
"Skip to content": ("Vai al contenuto", "Aller au contenu", "Zum Inhalt springen"),
"Work": ("Lavori", "Réalisations", "Arbeiten"),
"Research": ("Ricerca", "Recherche", "Forschung"),
"Writing": ("Scritti", "Écrits", "Texte"),
"CV": ("CV", "CV", "Lebenslauf"),
"Contact": ("Contatti", "Contact", "Kontakt"),
"Email me": ("Scrivimi", "Écrivez-moi", "E-Mail schreiben"),
"Full CV": ("CV completo", "CV complet", "Voller Lebenslauf"),
"Start a conversation": ("Iniziamo a parlare", "Engager la conversation", "Gespräch beginnen"),
"Start a conversation…": ("Iniziamo a parlare…", "Engager la conversation…", "Gespräch beginnen…"),
"See the work": ("Vedi i lavori", "Voir les réalisations", "Arbeiten ansehen"),
"Back to the practice": ("Torna alla pratica", "Retour à la pratique", "Zurück zur Praxis"),

# ---- home: meta -----------------------------------------------------------
"Viacheslav Munister · Applied systems research and digital practice": (
    "Viacheslav Munister · Ricerca sui sistemi applicati e pratica digitale",
    "Viacheslav Munister · Recherche en systèmes appliqués et pratique numérique",
    "Viacheslav Munister · Angewandte Systemforschung und digitale Praxis"),
"Viacheslav Munister: researcher, product architect and developer. Product strategy, data systems, web platforms and native iOS apps, from discovery to launch.": (
    "Viacheslav Munister: ricercatore, product architect e sviluppatore. Strategia di prodotto, sistemi di dati, piattaforme web e app iOS native, dalla scoperta al lancio.",
    "Viacheslav Munister : chercheur, architecte produit et développeur. Stratégie produit, systèmes de données, plateformes web et applications iOS natives, de la découverte au lancement.",
    "Viacheslav Munister: Forscher, Produktarchitekt und Entwickler. Produktstrategie, Datensysteme, Webplattformen und native iOS-Apps, von der Entdeckung bis zum Launch."),
"Research, product architecture and software delivery for publishing, education, retail and cultural heritage.": (
    "Ricerca, architettura di prodotto e sviluppo software per editoria, formazione, retail e patrimonio culturale.",
    "Recherche, architecture produit et développement logiciel pour l’édition, l’éducation, le commerce et le patrimoine culturel.",
    "Forschung, Produktarchitektur und Softwareentwicklung für Verlagswesen, Bildung, Einzelhandel und Kulturerbe."),
"Viacheslav Munister, independent practice": ("Viacheslav Munister, pratica indipendente", "Viacheslav Munister, pratique indépendante", "Viacheslav Munister, unabhängige Praxis"),

# ---- home: opening ----------------------------------------------------------
"Digital systems for research, publishing and operations.": (
    "Sistemi digitali per la ricerca, l’editoria e le operazioni.",
    "Des systèmes numériques pour la recherche, l’édition et les opérations.",
    "Digitale Systeme für Forschung, Verlagswesen und Betrieb."),
"A systems approach to": ("Un approccio sistemico a", "Une approche systémique de", "Ein systemischer Ansatz für"),
"#publishing": ("#editoria", "#édition", "#Verlagswesen"),
"#education": ("#formazione", "#éducation", "#Bildung"),
"#retail operations": ("#retail", "#commerce", "#Einzelhandel"),
"#iOS apps": ("#app iOS", "#applications iOS", "#iOS-Apps"),
"#museums": ("#musei", "#musées", "#Museen"),
"#research": ("#ricerca", "#recherche", "#Forschung"),
"#data models": ("#modelli di dati", "#modèles de données", "#Datenmodelle"),
"and": ("e", "et", "und"),
"#integrations": ("#integrazioni", "#intégrations", "#Integrationen"),
"Researcher, product architect and developer. I turn complex workflows into working digital products: from requirements and data models to interfaces, integrations and launch. My practice spans publishing, education, retail operations and native iOS apps.": (
    "Ricercatore, product architect e sviluppatore. Trasformo flussi di lavoro complessi in prodotti digitali funzionanti: dai requisiti e dai modelli di dati alle interfacce, alle integrazioni e al lancio. La mia pratica spazia tra editoria, formazione, operazioni di vendita al dettaglio e app iOS native.",
    "Chercheur, architecte produit et développeur. Je transforme des processus complexes en produits numériques opérationnels : des besoins et des modèles de données jusqu’aux interfaces, aux intégrations et au lancement. Ma pratique couvre l’édition, l’éducation, les opérations du commerce de détail et les applications iOS natives.",
    "Forscher, Produktarchitekt und Entwickler. Ich verwandle komplexe Arbeitsabläufe in funktionierende digitale Produkte: von Anforderungen und Datenmodellen bis zu Oberflächen, Integrationen und Launch. Meine Praxis reicht von Verlagswesen und Bildung über Einzelhandelsbetrieb bis zu nativen iOS-Apps."),

# ---- home: practice ----------------------------------------------------------
"Practice": ("Pratica", "Pratique", "Praxis"),
"Applied systems practice": ("Pratica dei sistemi applicati", "Pratique des systèmes appliqués", "Praxis angewandter Systeme"),
"Selected live systems, each organised around a concrete research or operational problem, a data model and a maintainable delivery path.": (
    "Sistemi attivi selezionati, ciascuno costruito attorno a un problema concreto di ricerca o di operatività, a un modello di dati e a un percorso di rilascio sostenibile.",
    "Une sélection de systèmes en service, chacun organisé autour d’un problème concret de recherche ou d’exploitation, d’un modèle de données et d’une chaîne de livraison maintenable.",
    "Ausgewählte Live-Systeme, jedes um ein konkretes Forschungs- oder Betriebsproblem, ein Datenmodell und einen wartbaren Auslieferungsweg herum gebaut."),
"Virtual museum": ("Museo virtuale", "Musée virtuel", "Virtuelles Museum"),
"A museum without a building: 583 openly licensed works by 360 artists, hung as one route through 40 halls, each shown at its true scale with source and licence.": (
    "Un museo senza edificio: 583 opere con licenza aperta di 360 artisti, disposte come un unico percorso attraverso 40 sale, ciascuna mostrata nella sua scala reale con fonte e licenza.",
    "Un musée sans bâtiment : 583 œuvres sous licence libre de 360 artistes, accrochées en un seul parcours à travers 40 salles, chacune montrée à sa taille réelle avec sa source et sa licence.",
    "Ein Museum ohne Gebäude: 583 offen lizenzierte Werke von 360 Künstlerinnen und Künstlern, als ein einziger Weg durch 40 Säle gehängt, jedes in seinem wahren Maßstab mit Quelle und Lizenz."),
"Retail operations": ("Operazioni retail", "Opérations commerciales", "Einzelhandelsbetrieb"),
"An operations core for a clothing retailer: schema matching, deterministic record linkage and stock kept correct under concurrent writers.": (
    "Il nucleo operativo di un rivenditore di abbigliamento: schema matching, collegamento deterministico dei record e giacenze corrette anche con scritture concorrenti.",
    "Le cœur opérationnel d’un détaillant de vêtements : rapprochement de schémas, liaison déterministe des enregistrements et stocks justes même sous écritures concurrentes.",
    "Der Betriebskern eines Bekleidungshändlers: Schema-Matching, deterministische Datensatzverknüpfung und korrekte Lagerbestände auch bei gleichzeitigen Schreibzugriffen."),
"Learning platform": ("Piattaforma didattica", "Plateforme d’apprentissage", "Lernplattform"),
"A workspace for language teachers that turns plans, video and vocabulary into editable lessons, worksheets and more than thirty classroom games.": (
    "Uno spazio di lavoro per insegnanti di lingue che trasforma piani, video e vocabolario in lezioni modificabili, schede di lavoro e più di trenta giochi per la classe.",
    "Un espace de travail pour les enseignants de langues qui transforme plans, vidéos et vocabulaire en leçons modifiables, fiches d’exercices et plus de trente jeux de classe.",
    "Ein Arbeitsraum für Sprachlehrkräfte, der Pläne, Videos und Vokabeln in bearbeitbare Lektionen, Arbeitsblätter und mehr als dreißig Klassenspiele verwandelt."),
"Editorial platform": ("Piattaforma editoriale", "Plateforme éditoriale", "Redaktionsplattform"),
"An independent journal of architecture, design and visual culture, where every piece carries a digital passport: provenance, review and a path for re-use.": (
    "Una rivista indipendente di architettura, design e cultura visiva, in cui ogni contributo ha un passaporto digitale: provenienza, revisione e un percorso di riutilizzo.",
    "Une revue indépendante d’architecture, de design et de culture visuelle, où chaque article porte un passeport numérique : provenance, relecture et voie de réutilisation.",
    "Eine unabhängige Zeitschrift für Architektur, Design und visuelle Kultur, in der jeder Beitrag einen digitalen Pass trägt: Herkunft, Prüfung und ein Weg zur Wiederverwendung."),
"iOS app · App Store": ("App iOS · App Store", "Application iOS · App Store", "iOS-App · App Store"),
"EPRIS Journal for iPhone and iPad": ("EPRIS Journal per iPhone e iPad", "EPRIS Journal pour iPhone et iPad", "EPRIS Journal für iPhone und iPad"),
"The journal’s native app for iPhone and iPad: essays typeset for the screen, full-screen photography and offline reading. No account, no tracking.": (
    "L’app nativa della rivista per iPhone e iPad: saggi impaginati per lo schermo, fotografia a tutto schermo e lettura offline. Nessun account, nessun tracciamento.",
    "L’application native de la revue pour iPhone et iPad : essais composés pour l’écran, photographie plein écran et lecture hors ligne. Sans compte, sans suivi.",
    "Die native App der Zeitschrift für iPhone und iPad: für den Bildschirm gesetzte Essays, vollflächige Fotografie und Offline-Lesen. Kein Konto, kein Tracking."),
"Architectura: Italy Drawn": ("Architectura: l’Italia disegnata", "Architectura : l’Italie dessinée", "Architectura: Italien gezeichnet"),
"An atlas of Italian architecture drawn line by line: 47 measured plates from Aosta to Sicily, 599 named parts, the live sun of Rome through the Pantheon’s oculus, 3D models and seven courses with exams and diplomas.": (
    "Un atlante dell’architettura italiana disegnato linea per linea: 47 tavole misurate da Aosta alla Sicilia, 599 elementi nominati, il sole vivo di Roma attraverso l’oculo del Pantheon, modelli 3D e sette corsi con esami e diplomi.",
    "Un atlas de l’architecture italienne dessiné trait par trait : 47 planches mesurées d’Aoste à la Sicile, 599 éléments nommés, le soleil de Rome en direct à travers l’oculus du Panthéon, des modèles 3D et sept cours avec examens et diplômes.",
    "Ein Atlas der italienischen Architektur, Linie für Linie gezeichnet: 47 vermessene Tafeln von Aosta bis Sizilien, 599 benannte Bauteile, die lebendige Sonne Roms durch das Opaion des Pantheons, 3D-Modelle und sieben Kurse mit Prüfungen und Diplomen."),
"Irpin City for iPhone": ("Irpin City per iPhone", "Irpin City pour iPhone", "Irpin City für iPhone"),
"An independent guide to Irpin: trains and minibuses, a 3D map with shelters, air raid alerts, DTEK outages, utilities and 50 routes. Free; your data stays on the phone.": (
    "Una guida indipendente a Irpin: treni e marshrutke, una mappa 3D con rifugi, allarmi aerei, interruzioni DTEK, utenze e 50 percorsi. Gratuita; i dati restano sul telefono.",
    "Un guide indépendant d’Irpin : trains et marchroutkas, une carte 3D avec abris, alertes aériennes, coupures DTEK, services et 50 itinéraires. Gratuit ; vos données restent sur le téléphone.",
    "Ein unabhängiger Führer durch Irpin: Züge und Marschrutkas, eine 3D-Karte mit Schutzräumen, Luftalarme, DTEK-Ausfälle, Versorgung und 50 Routen. Kostenlos; Ihre Daten bleiben auf dem Telefon."),
"AM Publishing for iPhone": ("AM Publishing per iPhone", "AM Publishing pour iPhone", "AM Publishing für iPhone"),
"The publisher’s app: the catalogue with covers and excerpts, a literary workshop with quizzes, events in Berlin and a reader’s card with points and medals. Free; reader data stays on the device.": (
    "L’app della casa editrice: il catalogo con copertine ed estratti, un laboratorio letterario con quiz, eventi a Berlino e una tessera del lettore con punti e medaglie. Gratuita; i dati del lettore restano sul dispositivo.",
    "L’application de la maison d’édition : le catalogue avec couvertures et extraits, un atelier littéraire avec quiz, des événements à Berlin et une carte de lecteur avec points et médailles. Gratuite ; les données du lecteur restent sur l’appareil.",
    "Die App des Verlags: der Katalog mit Covern und Leseproben, eine Literaturwerkstatt mit Quizfragen, Veranstaltungen in Berlin und ein Leserausweis mit Punkten und Medaillen. Kostenlos; die Leserdaten bleiben auf dem Gerät."),
"Open source · Oracle": ("Open source · Oracle", "Open source · Oracle", "Open Source · Oracle"),
"A browser-native relational modeller for Oracle: tables and relations like a design tool, DDL import and export, and an SQL sandbox. No build step, no backend.": (
    "Un modellatore relazionale per Oracle che funziona nel browser: tabelle e relazioni come in uno strumento di design, import ed export DDL e una sandbox SQL. Nessuna fase di build, nessun backend.",
    "Un modeleur relationnel pour Oracle, natif du navigateur : tables et relations comme dans un outil de design, import et export DDL, et un bac à sable SQL. Sans étape de build, sans backend.",
    "Ein browsernativer relationaler Modellierer für Oracle: Tabellen und Beziehungen wie in einem Designwerkzeug, DDL-Import und -Export sowie eine SQL-Sandbox. Kein Build-Schritt, kein Backend."),
"Registered software · Copyright No. 142485": ("Software registrato · Copyright n. 142485", "Logiciel enregistré · Droit d’auteur n° 142485", "Registrierte Software · Urheberrecht Nr. 142485"),
"Fuzzy Risk Assessment System": ("Sistema di valutazione del rischio fuzzy", "Système d’évaluation floue des risques", "System zur Fuzzy-Risikobewertung"),
"A software complex for intelligent assessment of financial risks built on fuzzy logic and Boolean minimisation. Registered with the Ukrainian National Office of Intellectual Property and Innovation on 12 February 2026; author and sole owner of the economic rights.": (
    "Un complesso software per la valutazione intelligente dei rischi finanziari basato sulla logica fuzzy e sulla minimizzazione booleana. Registrato presso l’Ufficio nazionale ucraino per la proprietà intellettuale e l’innovazione il 12 febbraio 2026; autore e unico titolare dei diritti patrimoniali.",
    "Un ensemble logiciel d’évaluation intelligente des risques financiers fondé sur la logique floue et la minimisation booléenne. Enregistré auprès de l’Office national ukrainien de la propriété intellectuelle et de l’innovation le 12 février 2026 ; auteur et unique titulaire des droits patrimoniaux.",
    "Ein Softwarekomplex zur intelligenten Bewertung finanzieller Risiken auf Grundlage von Fuzzy-Logik und Boolescher Minimierung. Beim Ukrainischen Nationalen Amt für geistiges Eigentum und Innovation am 12. Februar 2026 registriert; Autor und alleiniger Inhaber der wirtschaftlichen Rechte."),
"Certificate No. 142485 · UKRNOIVI": ("Certificato n. 142485 · UKRNOIVI", "Certificat n° 142485 · UKRNOIVI", "Zertifikat Nr. 142485 · UKRNOIVI"),

# ---- home: competencies ----------------------------------------------------
"Competencies": ("Competenze", "Compétences", "Kompetenzen"),
"From problem to working product": ("Dal problema al prodotto funzionante", "Du problème au produit opérationnel", "Vom Problem zum funktionierenden Produkt"),
"Product decisions, hands-on engineering and research, connected across the full delivery cycle.": (
    "Decisioni di prodotto, ingegneria pratica e ricerca, collegate lungo l’intero ciclo di rilascio.",
    "Décisions produit, ingénierie concrète et recherche, reliées sur tout le cycle de livraison.",
    "Produktentscheidungen, praktische Entwicklung und Forschung, verbunden über den gesamten Auslieferungszyklus."),
"Product strategy and requirements": ("Strategia di prodotto e requisiti", "Stratégie produit et besoins", "Produktstrategie und Anforderungen"),
"I analyse workflows, define requirements and priorities, and shape roadmaps, information architecture and UX. I connect product decisions to the people, processes and constraints the system has to serve.": (
    "Analizzo i flussi di lavoro, definisco requisiti e priorità e do forma a roadmap, architettura dell’informazione e UX. Collego le decisioni di prodotto alle persone, ai processi e ai vincoli che il sistema deve servire.",
    "J’analyse les processus, je définis les besoins et les priorités, et je construis feuilles de route, architecture de l’information et UX. Je relie les décisions produit aux personnes, aux processus et aux contraintes que le système doit servir.",
    "Ich analysiere Arbeitsabläufe, definiere Anforderungen und Prioritäten und gestalte Roadmaps, Informationsarchitektur und UX. Ich verbinde Produktentscheidungen mit den Menschen, Prozessen und Rahmenbedingungen, denen das System dienen muss."),
"System architecture and data": ("Architettura di sistema e dati", "Architecture système et données", "Systemarchitektur und Daten"),
"I model entities, relationships and business rules in PostgreSQL, SQLite and Oracle. I build REST services and import pipelines with TypeScript, Python and SQL, including schema matching, record linkage and stock integrity under concurrent updates.": (
    "Modello entità, relazioni e regole di business in PostgreSQL, SQLite e Oracle. Costruisco servizi REST e pipeline di importazione con TypeScript, Python e SQL, tra cui schema matching, collegamento dei record e integrità delle giacenze con aggiornamenti concorrenti.",
    "Je modélise entités, relations et règles métier dans PostgreSQL, SQLite et Oracle. Je construis des services REST et des chaînes d’import avec TypeScript, Python et SQL, notamment le rapprochement de schémas, la liaison d’enregistrements et l’intégrité des stocks sous mises à jour concurrentes.",
    "Ich modelliere Entitäten, Beziehungen und Geschäftsregeln in PostgreSQL, SQLite und Oracle. Ich baue REST-Dienste und Import-Pipelines mit TypeScript, Python und SQL, darunter Schema-Matching, Datensatzverknüpfung und Bestandsintegrität bei gleichzeitigen Aktualisierungen."),
"Web platforms and interfaces": ("Piattaforme web e interfacce", "Plateformes web et interfaces", "Webplattformen und Oberflächen"),
"I build editorial systems, learning workspaces and browser-based tools with React, Next.js or plain HTML, CSS and JavaScript. The work includes responsive layouts, editing workflows and the connections between the interface and its data.": (
    "Costruisco sistemi editoriali, spazi di apprendimento e strumenti basati sul browser con React, Next.js o semplice HTML, CSS e JavaScript. Il lavoro comprende layout responsive, flussi di redazione e i collegamenti tra l’interfaccia e i suoi dati.",
    "Je construis des systèmes éditoriaux, des espaces d’apprentissage et des outils dans le navigateur avec React, Next.js ou du simple HTML, CSS et JavaScript. Le travail comprend des mises en page adaptatives, des flux de rédaction et les liens entre l’interface et ses données.",
    "Ich baue Redaktionssysteme, Lernumgebungen und browserbasierte Werkzeuge mit React, Next.js oder schlichtem HTML, CSS und JavaScript. Dazu gehören responsive Layouts, Redaktionsabläufe und die Verbindungen zwischen Oberfläche und Daten."),
"Native iOS products": ("Prodotti iOS nativi", "Produits iOS natifs", "Native iOS-Produkte"),
"I develop iPhone and iPad apps in Swift and SwiftUI, taking the product from screen structure to App Store release. My published work brings together native reading, full-screen imagery, offline content and interactive architectural material.": (
    "Sviluppo app per iPhone e iPad in Swift e SwiftUI, accompagnando il prodotto dalla struttura delle schermate al rilascio sull’App Store. I miei lavori pubblicati uniscono lettura nativa, immagini a tutto schermo, contenuti offline e materiale architettonico interattivo.",
    "Je développe des applications iPhone et iPad en Swift et SwiftUI, en menant le produit de la structure des écrans à la publication sur l’App Store. Mes réalisations publiées réunissent lecture native, images plein écran, contenu hors ligne et matériel architectural interactif.",
    "Ich entwickle iPhone- und iPad-Apps in Swift und SwiftUI und führe das Produkt von der Bildschirmstruktur bis zur Veröffentlichung im App Store. Meine veröffentlichten Arbeiten verbinden natives Lesen, vollflächige Bilder, Offline-Inhalte und interaktives Architekturmaterial."),
"AI and content integrations": ("Integrazioni di IA e contenuti", "Intégrations d’IA et de contenus", "KI- und Inhaltsintegrationen"),
"I integrate LLM APIs into editorial and educational workflows, with generated material kept editable and reviewable. I also connect external content, IIIF collections and geographic data, working with formats, time zones and authentication.": (
    "Integro le API di LLM nei flussi editoriali e didattici, mantenendo il materiale generato modificabile e verificabile. Collego anche contenuti esterni, collezioni IIIF e dati geografici, lavorando con formati, fusi orari e autenticazione.",
    "J’intègre des API de LLM dans les flux éditoriaux et pédagogiques, en gardant le contenu généré modifiable et relisible. Je connecte aussi des contenus externes, des collections IIIF et des données géographiques, en travaillant avec les formats, les fuseaux horaires et l’authentification.",
    "Ich integriere LLM-APIs in redaktionelle und pädagogische Abläufe, sodass erzeugtes Material bearbeitbar und prüfbar bleibt. Außerdem binde ich externe Inhalte, IIIF-Sammlungen und Geodaten an und arbeite dabei mit Formaten, Zeitzonen und Authentifizierung."),
"Deployment and operations": ("Distribuzione e operatività", "Déploiement et exploitation", "Bereitstellung und Betrieb"),
"I deploy and maintain services on Linux with nginx, TLS, systemd, Docker and GitHub Actions. Release workflows, backups and technical documentation are part of delivery, so the product can be updated and supported after launch.": (
    "Distribuisco e mantengo servizi su Linux con nginx, TLS, systemd, Docker e GitHub Actions. Flussi di rilascio, backup e documentazione tecnica fanno parte della consegna, così il prodotto può essere aggiornato e supportato dopo il lancio.",
    "Je déploie et maintiens des services sous Linux avec nginx, TLS, systemd, Docker et GitHub Actions. Les processus de publication, les sauvegardes et la documentation technique font partie de la livraison, afin que le produit puisse être mis à jour et suivi après le lancement.",
    "Ich stelle Dienste unter Linux mit nginx, TLS, systemd, Docker und GitHub Actions bereit und betreibe sie. Release-Abläufe, Backups und technische Dokumentation gehören zur Auslieferung, damit das Produkt nach dem Launch aktualisiert und betreut werden kann."),
"Editorial work and cultural collections": ("Lavoro editoriale e collezioni culturali", "Travail éditorial et collections culturelles", "Redaktionelle Arbeit und Kultursammlungen"),
"I research, write and edit long-form pieces, conduct interviews and plan issues. Museum curation and picture research extend this practice into provenance, licensing, digital passports and collections that readers can navigate and reuse.": (
    "Faccio ricerca, scrivo e curo testi lunghi, conduco interviste e pianifico i numeri. La curatela museale e la ricerca iconografica estendono questa pratica a provenienza, licenze, passaporti digitali e collezioni che i lettori possono esplorare e riutilizzare.",
    "Je fais des recherches, j’écris et je relis des textes longs, je mène des entretiens et je planifie les numéros. La curation muséale et la recherche iconographique prolongent cette pratique vers la provenance, les licences, les passeports numériques et des collections que les lecteurs peuvent parcourir et réutiliser.",
    "Ich recherchiere, schreibe und redigiere Langtexte, führe Interviews und plane Ausgaben. Museumskuration und Bildrecherche erweitern diese Praxis um Herkunft, Lizenzen, digitale Pässe und Sammlungen, die Leserinnen und Leser durchsuchen und wiederverwenden können."),
"Applied research and automation": ("Ricerca applicata e automazione", "Recherche appliquée et automatisation", "Angewandte Forschung und Automatisierung"),
"My peer-reviewed work covers industrial automation and measurement, edge computing and machine learning. This research informs how I approach operational data, control systems and decisions made under practical constraints.": (
    "I miei lavori sottoposti a revisione paritaria riguardano l’automazione e la misurazione industriale, l’edge computing e il machine learning. Questa ricerca orienta il mio approccio ai dati operativi, ai sistemi di controllo e alle decisioni prese in condizioni pratiche reali.",
    "Mes travaux évalués par les pairs portent sur l’automatisation et la mesure industrielles, l’edge computing et l’apprentissage automatique. Cette recherche nourrit ma façon d’aborder les données d’exploitation, les systèmes de commande et les décisions prises sous contraintes pratiques.",
    "Meine begutachteten Arbeiten behandeln industrielle Automatisierung und Messtechnik, Edge Computing und maschinelles Lernen. Diese Forschung prägt, wie ich Betriebsdaten, Steuerungssysteme und Entscheidungen unter praktischen Randbedingungen angehe."),

# ---- home: research & writing teasers -----------------------------------------
"29 peer-reviewed papers, 2021 to 2026, primarily in Scopus-indexed proceedings. The research informs the practical work above rather than sitting beside it.": (
    "29 articoli sottoposti a revisione paritaria, dal 2021 al 2026, soprattutto in atti indicizzati in Scopus. La ricerca alimenta il lavoro pratico qui sopra, invece di stargli accanto.",
    "29 articles évalués par les pairs, de 2021 à 2026, principalement dans des actes de conférences indexés par Scopus. La recherche nourrit le travail pratique ci-dessus plutôt que de rester à côté.",
    "29 begutachtete Beiträge von 2021 bis 2026, überwiegend in Scopus-indizierten Tagungsbänden. Die Forschung speist die oben gezeigte praktische Arbeit, statt neben ihr zu stehen."),
"Industrial automation and measurement: edge computing and machine learning for decisions made under real constraints.": (
    "Automazione e misurazione industriale: edge computing e machine learning per decisioni prese in condizioni reali.",
    "Automatisation et mesure industrielles : edge computing et apprentissage automatique pour des décisions prises sous contraintes réelles.",
    "Industrielle Automatisierung und Messtechnik: Edge Computing und maschinelles Lernen für Entscheidungen unter realen Randbedingungen."),
"All 29 papers": ("Tutti i 29 articoli", "Les 29 articles", "Alle 29 Beiträge"),
"Editorial": ("Editoriale", "Éditorial", "Redaktion"),
"Read": ("Leggi", "Lire", "Lesen"),
"Most of this work is about making archives, collections and records easier to find, read and reuse.": (
    "Gran parte di questo lavoro consiste nel rendere archivi, collezioni e documenti più facili da trovare, leggere e riutilizzare.",
    "L’essentiel de ce travail consiste à rendre les archives, les collections et les documents plus faciles à trouver, à lire et à réutiliser.",
    "Das meiste dieser Arbeit besteht darin, Archive, Sammlungen und Aufzeichnungen leichter auffindbar, lesbar und wiederverwendbar zu machen."),
"Heritage associations": ("Associazioni per il patrimonio", "Associations du patrimoine", "Vereine für Kulturerbe"),
"Member of two French associations that research cultural heritage and keep it close to lived places and public conversation.": (
    "Membro di due associazioni francesi che studiano il patrimonio culturale e lo tengono vicino ai luoghi vissuti e al dibattito pubblico.",
    "Membre de deux associations françaises qui étudient le patrimoine culturel et le gardent proche des lieux vécus et du débat public.",
    "Mitglied in zwei französischen Vereinen, die Kulturerbe erforschen und es nah an den gelebten Orten und am öffentlichen Gespräch halten."),
"Open to product work and consulting": ("Disponibile per lavoro di prodotto e consulenza", "Ouvert aux missions produit et au conseil", "Offen für Produktarbeit und Beratung"),
"Systems analysis and architecture, operational data models, editorial research infrastructure, ERP, IIoT and edge computing, machine learning and interface prototyping.": (
    "Analisi e architettura dei sistemi, modelli di dati operativi, infrastruttura per la ricerca editoriale, ERP, IIoT ed edge computing, machine learning e prototipazione di interfacce.",
    "Analyse et architecture de systèmes, modèles de données opérationnels, infrastructure de recherche éditoriale, ERP, IIoT et edge computing, apprentissage automatique et prototypage d’interfaces.",
    "Systemanalyse und -architektur, operative Datenmodelle, redaktionelle Forschungsinfrastruktur, ERP, IIoT und Edge Computing, maschinelles Lernen und Oberflächen-Prototyping."),

# ---- research page ------------------------------------------------------------
"Research · Viacheslav Munister": ("Ricerca · Viacheslav Munister", "Recherche · Viacheslav Munister", "Forschung · Viacheslav Munister"),
"Peer-reviewed papers by Viacheslav Munister on industrial automation, edge and fog computing, machine learning in measurement systems and digital transformation. 29 publications, 2021–2026, each with a DOI.": (
    "Articoli sottoposti a revisione paritaria di Viacheslav Munister su automazione industriale, edge e fog computing, machine learning nei sistemi di misura e trasformazione digitale. 29 pubblicazioni, 2021–2026, ciascuna con un DOI.",
    "Articles évalués par les pairs de Viacheslav Munister sur l’automatisation industrielle, l’edge et le fog computing, l’apprentissage automatique dans les systèmes de mesure et la transformation numérique. 29 publications, 2021–2026, chacune avec un DOI.",
    "Begutachtete Beiträge von Viacheslav Munister zu industrieller Automatisierung, Edge und Fog Computing, maschinellem Lernen in Messsystemen und digitaler Transformation. 29 Veröffentlichungen, 2021–2026, jeweils mit DOI."),
"29 peer-reviewed papers, 2021–2026: industrial automation, edge and fog computing, machine learning in measurement systems.": (
    "29 articoli con revisione paritaria, 2021–2026: automazione industriale, edge e fog computing, machine learning nei sistemi di misura.",
    "29 articles évalués par les pairs, 2021–2026 : automatisation industrielle, edge et fog computing, apprentissage automatique dans les systèmes de mesure.",
    "29 begutachtete Beiträge, 2021–2026: industrielle Automatisierung, Edge und Fog Computing, maschinelles Lernen in Messsystemen."),
"Research by Viacheslav Munister": ("Ricerca di Viacheslav Munister", "Recherche de Viacheslav Munister", "Forschung von Viacheslav Munister"),
"Peer-reviewed papers · 2021–2026": ("Articoli con revisione paritaria · 2021–2026", "Articles évalués par les pairs · 2021–2026", "Begutachtete Beiträge · 2021–2026"),
"Applied research in industrial automation and measurement: edge and fog computing, machine learning in production processes, information and measurement systems, and the digital transformation of engineering work. Most appear in Scopus-indexed conference proceedings (AIP Conference Proceedings, IOP and Journal of Physics: Conference Series). Every entry opens at its DOI.": (
    "Ricerca applicata nell’automazione e nella misurazione industriale: edge e fog computing, machine learning nei processi produttivi, sistemi informativi e di misura e trasformazione digitale del lavoro ingegneristico. La maggior parte è pubblicata in atti di convegni indicizzati in Scopus (AIP Conference Proceedings, IOP e Journal of Physics: Conference Series). Ogni voce si apre sul proprio DOI.",
    "Recherche appliquée en automatisation et mesure industrielles : edge et fog computing, apprentissage automatique dans les procédés de production, systèmes d’information et de mesure, et transformation numérique du travail d’ingénierie. La plupart paraissent dans des actes de conférences indexés par Scopus (AIP Conference Proceedings, IOP et Journal of Physics: Conference Series). Chaque entrée s’ouvre sur son DOI.",
    "Angewandte Forschung zu industrieller Automatisierung und Messtechnik: Edge und Fog Computing, maschinelles Lernen in Produktionsprozessen, Informations- und Messsysteme sowie die digitale Transformation der Ingenieurarbeit. Die meisten erscheinen in Scopus-indizierten Tagungsbänden (AIP Conference Proceedings, IOP und Journal of Physics: Conference Series). Jeder Eintrag öffnet sich bei seiner DOI."),
"Publications": ("Pubblicazioni", "Publications", "Veröffentlichungen"),
"Years": ("Anni", "Années", "Jahre"),
"Venues": ("Sedi", "Revues et actes", "Publikationsorte"),
"Main venues": ("Sedi principali", "Principales sources", "Hauptorte"),
"Cited by": ("Citato da", "Cité par", "Zitiert von"),
"1 paper": ("1 articolo", "1 article", "1 Beitrag"),
"2 papers": ("2 articoli", "2 articles", "2 Beiträge"),
"5 papers": ("5 articoli", "5 articles", "5 Beiträge"),
"20 papers": ("20 articoli", "20 articles", "20 Beiträge"),
"9 selected of 70+": ("9 selezionati su 70+", "9 sélectionnés sur plus de 70", "9 ausgewählt von über 70"),
"Independent citations of this work in unrelated research – not self-citations or direct collaborators – drawn from the Semantic Scholar citation graph, the same index behind Google Scholar and Scopus records. Selected for reach: a peer-reviewed journal, a different field, a different continent.": (
    "Citazioni indipendenti di questo lavoro in ricerche non collegate – non autocitazioni né collaboratori diretti – tratte dal grafo delle citazioni di Semantic Scholar, lo stesso indice che sta dietro Google Scholar e Scopus. Selezionate per portata: una rivista con revisione paritaria, un altro campo, un altro continente.",
    "Citations indépendantes de ce travail dans des recherches sans lien – ni autocitations ni collaborateurs directs – tirées du graphe de citations de Semantic Scholar, le même index que celui de Google Scholar et de Scopus. Choisies pour leur portée : une revue à comité de lecture, un autre domaine, un autre continent.",
    "Unabhängige Zitierungen dieser Arbeit in fremder Forschung – keine Selbstzitate und keine direkten Mitarbeitenden – aus dem Zitationsgraphen von Semantic Scholar, demselben Index, der hinter Google Scholar und Scopus steht. Nach Reichweite ausgewählt: eine begutachtete Zeitschrift, ein anderes Fach, ein anderer Kontinent."),
"Collaboration and review": ("Collaborazione e revisione", "Collaboration et relecture", "Zusammenarbeit und Begutachtung"),
"Open to joint research in industrial automation, edge computing and applied machine learning.": (
    "Disponibile a ricerche congiunte in automazione industriale, edge computing e machine learning applicato.",
    "Ouvert à des recherches conjointes en automatisation industrielle, edge computing et apprentissage automatique appliqué.",
    "Offen für gemeinsame Forschung zu industrieller Automatisierung, Edge Computing und angewandtem maschinellem Lernen."),

# ---- cv page ------------------------------------------------------------------
"Viacheslav Munister · CV": ("Viacheslav Munister · CV", "Viacheslav Munister · CV", "Viacheslav Munister · Lebenslauf"),
"CV of Viacheslav Munister — writer, heritage researcher and digital maker working across archives, editorial systems, digital art and product delivery.": (
    "CV di Viacheslav Munister: autore, ricercatore del patrimonio e creatore digitale tra archivi, sistemi editoriali, arte digitale e sviluppo di prodotto.",
    "CV de Viacheslav Munister : auteur, chercheur en patrimoine et créateur numérique entre archives, systèmes éditoriaux, art numérique et développement de produit.",
    "Lebenslauf von Viacheslav Munister: Autor, Kulturerbe-Forscher und digitaler Macher zwischen Archiven, Redaktionssystemen, digitaler Kunst und Produktentwicklung."),
"Writer, editor and heritage researcher working across long-form journalism, museum curation, editorial systems and product delivery.": (
    "Autore, editor e ricercatore del patrimonio tra giornalismo di approfondimento, curatela museale, sistemi editoriali e sviluppo di prodotto.",
    "Auteur, rédacteur et chercheur en patrimoine entre journalisme de fond, curation muséale, systèmes éditoriaux et développement de produit.",
    "Autor, Redakteur und Kulturerbe-Forscher zwischen Langform-Journalismus, Museumskuration, Redaktionssystemen und Produktentwicklung."),
"Viacheslav Munister": ("Viacheslav Munister", "Viacheslav Munister", "Viacheslav Munister"),
"← munister.com.ua": ("← munister.com.ua", "← munister.com.ua", "← munister.com.ua"),
"Save as PDF": ("Salva come PDF", "Enregistrer en PDF", "Als PDF speichern"),
"Writer, editor and product lead. Long-form journalism, museum curation and the editorial and civic systems that carry them.": (
    "Autore, editor e responsabile di prodotto. Giornalismo di approfondimento, curatela museale e i sistemi editoriali e civici che li sostengono.",
    "Auteur, rédacteur et responsable produit. Journalisme de fond, curation muséale et les systèmes éditoriaux et civiques qui les portent.",
    "Autor, Redakteur und Produktverantwortlicher. Langform-Journalismus, Museumskuration und die redaktionellen und zivilen Systeme, die sie tragen."),
"Europe · remote": ("Europa · da remoto", "Europe · à distance", "Europa · remote"),
"Profile": ("Profilo", "Profil", "Profil"),
"Author and co-editor of EPRIS Journal, curator of the EPRIS Museum and a native iOS developer. I write and edit long-form work on architecture, art and cultural memory, and I lead the product side of editorial, educational, commerce and civic systems from discovery to launch. 29 peer-reviewed papers in industrial automation and measurement.": (
    "Autore e co-editor di EPRIS Journal, curatore dell’EPRIS Museum e sviluppatore iOS nativo. Scrivo e curo testi lunghi su architettura, arte e memoria culturale, e guido la parte di prodotto di sistemi editoriali, didattici, commerciali e civici dalla scoperta al lancio. 29 articoli con revisione paritaria in automazione e misurazione industriale.",
    "Auteur et co-rédacteur d’EPRIS Journal, commissaire de l’EPRIS Museum et développeur iOS natif. J’écris et je relis des textes longs sur l’architecture, l’art et la mémoire culturelle, et je dirige le volet produit de systèmes éditoriaux, éducatifs, commerciaux et civiques, de la découverte au lancement. 29 articles évalués par les pairs en automatisation et mesure industrielles.",
    "Autor und Mitherausgeber des EPRIS Journal, Kurator des EPRIS Museum und nativer iOS-Entwickler. Ich schreibe und redigiere Langtexte zu Architektur, Kunst und kulturellem Gedächtnis und verantworte die Produktseite redaktioneller, pädagogischer, kommerzieller und ziviler Systeme von der Entdeckung bis zum Launch. 29 begutachtete Beiträge zu industrieller Automatisierung und Messtechnik."),
"Experience": ("Esperienza", "Expérience", "Berufserfahrung"),
"Enterprise Systems Automation Specialist": ("Specialista di automazione dei sistemi aziendali", "Spécialiste en automatisation des systèmes d’entreprise", "Spezialist für Unternehmenssystem-Automatisierung"),
"Apr 2026 – present": ("apr 2026 – oggi", "avr. 2026 – aujourd’hui", "Apr. 2026 – heute"),
"LLC Information Technology Solutions · part-time": ("LLC Information Technology Solutions · part-time", "LLC Information Technology Solutions · temps partiel", "LLC Information Technology Solutions · Teilzeit"),
"Analyse business processes and requirements for ERP and operational automation projects.": (
    "Analisi dei processi aziendali e dei requisiti per progetti ERP e di automazione operativa.",
    "Analyse des processus métier et des besoins pour des projets ERP et d’automatisation opérationnelle.",
    "Analyse von Geschäftsprozessen und Anforderungen für ERP- und Betriebsautomatisierungsprojekte."),
"Turn them into solution structures, integration requirements and technical documentation.": (
    "Trasformazione in strutture di soluzione, requisiti di integrazione e documentazione tecnica.",
    "Traduction en structures de solution, exigences d’intégration et documentation technique.",
    "Überführung in Lösungsstrukturen, Integrationsanforderungen und technische Dokumentation."),
"Chief Technology Officer": ("Chief Technology Officer", "Directeur technique (CTO)", "Chief Technology Officer"),
"Oct 2025 – present": ("ott 2025 – oggi", "oct. 2025 – aujourd’hui", "Okt. 2025 – heute"),
"· workspace for language teachers": ("· spazio di lavoro per insegnanti di lingue", "· espace de travail pour enseignants de langues", "· Arbeitsraum für Sprachlehrkräfte"),
"Own product and technology direction: lesson boards, classroom tools, generated worksheets and more than thirty classroom games.": (
    "Responsabile della direzione di prodotto e tecnologia: lavagne di lezione, strumenti per la classe, schede generate e più di trenta giochi per la classe.",
    "Responsable de la direction produit et technologie : tableaux de leçon, outils de classe, fiches générées et plus de trente jeux de classe.",
    "Verantwortung für Produkt- und Technikrichtung: Lektionstafeln, Klassenzimmer-Werkzeuge, erzeugte Arbeitsblätter und mehr als dreißig Klassenspiele."),
"Set the roadmap and architecture; bring AI-assisted features into reliable production use.": (
    "Definizione di roadmap e architettura; messa in produzione affidabile di funzioni assistite dall’IA.",
    "Définition de la feuille de route et de l’architecture ; mise en production fiable de fonctionnalités assistées par l’IA.",
    "Festlegung von Roadmap und Architektur; Überführung KI-gestützter Funktionen in den zuverlässigen Produktivbetrieb."),
"Improved the mobile board experience and the deployment workflow.": (
    "Miglioramento dell’esperienza della lavagna su mobile e del flusso di distribuzione.",
    "Amélioration de l’expérience du tableau sur mobile et du flux de déploiement.",
    "Verbesserung der mobilen Tafelerfahrung und des Bereitstellungsablaufs."),
"Author, Co-Editor and Digital Director": ("Autore, co-editor e direttore digitale", "Auteur, co-rédacteur et directeur numérique", "Autor, Mitherausgeber und Digitaldirektor"),
"Jul 2025 – present": ("lug 2025 – oggi", "juil. 2025 – aujourd’hui", "Juli 2025 – heute"),
"· independent journal of art, architecture and design, Milan and Kyiv": (
    "· rivista indipendente di arte, architettura e design, Milano e Kyiv",
    "· revue indépendante d’art, d’architecture et de design, Milan et Kyiv",
    "· unabhängige Zeitschrift für Kunst, Architektur und Design, Mailand und Kyjiw"),
"Wrote 33 of the journal’s 45 stories and 6 of its 7 reviews, including 12 long-form interviews with artists, architects and institutions such as Museo Nivola.": (
    "Autore di 33 dei 45 articoli della rivista e di 6 delle sue 7 recensioni, tra cui 12 interviste approfondite con artisti, architetti e istituzioni come il Museo Nivola.",
    "Auteur de 33 des 45 articles de la revue et de 6 de ses 7 critiques, dont 12 longs entretiens avec des artistes, des architectes et des institutions comme le Museo Nivola.",
    "Autor von 33 der 45 Beiträge und 6 der 7 Rezensionen der Zeitschrift, darunter 12 ausführliche Interviews mit Künstlern, Architekten und Institutionen wie dem Museo Nivola."),
"Run interviews end to end: research, questionnaires in English and French, editing and approval by the interviewee.": (
    "Gestione completa delle interviste: ricerca, questionari in inglese e francese, redazione e approvazione da parte dell’intervistato.",
    "Conduite complète des entretiens : recherche, questionnaires en anglais et en français, édition et validation par la personne interrogée.",
    "Interviews von Anfang bis Ende: Recherche, Fragebögen auf Englisch und Französisch, Redaktion und Freigabe durch die interviewte Person."),
"Co-edited the Autumn 2026 edition,": ("Co-editor dell’edizione Autunno 2026,", "Co-rédaction du numéro Automne 2026,", "Mitherausgabe der Ausgabe Herbst 2026,"),
": 52 pieces in six sections, a 230 × 300 mm print layout and an online reader.": (
    ": 52 contributi in sei sezioni, un’impaginazione di stampa di 230 × 300 mm e un lettore online.",
    " : 52 contributions en six sections, une mise en page imprimée de 230 × 300 mm et un lecteur en ligne.",
    ": 52 Beiträge in sechs Rubriken, ein Drucklayout von 230 × 300 mm und ein Online-Reader."),
"Conceived and curate the EPRIS Museum: 583 openly licensed works by 360 artists in 40 halls, each credited with its licence and collection.": (
    "Ideatore e curatore dell’EPRIS Museum: 583 opere con licenza aperta di 360 artisti in 40 sale, ciascuna con licenza e collezione indicate.",
    "Concepteur et commissaire de l’EPRIS Museum : 583 œuvres sous licence libre de 360 artistes dans 40 salles, chacune créditée avec sa licence et sa collection.",
    "Konzeption und Kuration des EPRIS Museum: 583 offen lizenzierte Werke von 360 Künstlerinnen und Künstlern in 40 Sälen, jedes mit Lizenz und Sammlung ausgewiesen."),
"Built the editorial system: publishing flow, translation into seven languages, picture research and rights clearance.": (
    "Realizzazione del sistema editoriale: flusso di pubblicazione, traduzione in sette lingue, ricerca iconografica e gestione dei diritti.",
    "Construction du système éditorial : flux de publication, traduction en sept langues, recherche iconographique et clarification des droits.",
    "Aufbau des Redaktionssystems: Veröffentlichungsablauf, Übersetzung in sieben Sprachen, Bildrecherche und Rechteklärung."),
"Founder and Product Lead": ("Fondatore e responsabile di prodotto", "Fondateur et responsable produit", "Gründer und Produktverantwortlicher"),
"2024 – present": ("2024 – oggi", "2024 – aujourd’hui", "2024 – heute"),
"· independent digital product studio": ("· studio indipendente di prodotti digitali", "· studio indépendant de produits numériques", "· unabhängiges Studio für digitale Produkte"),
"Lead discovery, product strategy, information architecture, UX and delivery for client and in-house products.": (
    "Guida di discovery, strategia di prodotto, architettura dell’informazione, UX e rilascio per prodotti di clienti e interni.",
    "Pilotage de la découverte, de la stratégie produit, de l’architecture de l’information, de l’UX et de la livraison pour des produits clients et internes.",
    "Leitung von Discovery, Produktstrategie, Informationsarchitektur, UX und Auslieferung für Kunden- und Eigenprodukte."),
"Shipped and operate products in publishing, education, retail, ERP and civic services, including native iOS apps.": (
    "Rilascio e gestione di prodotti in editoria, formazione, retail, ERP e servizi civici, comprese app iOS native.",
    "Livraison et exploitation de produits dans l’édition, l’éducation, le commerce, l’ERP et les services civiques, dont des applications iOS natives.",
    "Auslieferung und Betrieb von Produkten in Verlagswesen, Bildung, Einzelhandel, ERP und zivilen Diensten, darunter native iOS-Apps."),
"Heritage and Digital Art Practice": ("Pratica di patrimonio e arte digitale", "Pratique du patrimoine et de l’art numérique", "Praxis für Kulturerbe und digitale Kunst"),
"Independent research, writing and interactive works": ("Ricerca indipendente, scrittura e opere interattive", "Recherche indépendante, écriture et œuvres interactives", "Unabhängige Forschung, Schreiben und interaktive Arbeiten"),
"Visual atlases and documentary platforms where an archive becomes a route.": (
    "Atlanti visivi e piattaforme documentarie in cui un archivio diventa un percorso.",
    "Atlas visuels et plateformes documentaires où une archive devient un parcours .",
    "Visuelle Atlanten und Dokumentationsplattformen, in denen ein Archiv zu einem Weg wird."),
"Selected work": ("Lavori selezionati", "Réalisations choisies", "Ausgewählte Arbeiten"),
"Irpin City": ("Irpin City", "Irpin City", "Irpin City"),
"iOS · 2026": ("iOS · 2026", "iOS · 2026", "iOS · 2026"),
"Independent city guide: transport, 3D map with shelters, alerts, power schedule, utilities, 50 routes with navigation.": (
    "Guida indipendente della città: trasporti, mappa 3D con rifugi, allerte, orari dell’elettricità, servizi, 50 percorsi con navigazione.",
    "Guide indépendant de la ville : transports, carte 3D avec abris, alertes, horaires d’électricité, services, 50 itinéraires avec navigation.",
    "Unabhängiger Stadtführer: Verkehr, 3D-Karte mit Schutzräumen, Warnungen, Stromplan, Versorgung, 50 Routen mit Navigation."),
"EPRIS Journal app": ("App EPRIS Journal", "Application EPRIS Journal", "EPRIS-Journal-App"),
"iOS": ("iOS", "iOS", "iOS"),
"The journal on iPhone and iPad: native typesetting, full-screen photography, offline reading. On the App Store.": (
    "La rivista su iPhone e iPad: impaginazione nativa, fotografia a tutto schermo, lettura offline. Sull’App Store.",
    "La revue sur iPhone et iPad : composition native, photographie plein écran, lecture hors ligne. Sur l’App Store.",
    "Die Zeitschrift auf iPhone und iPad: native Typografie, vollflächige Fotografie, Offline-Lesen. Im App Store."),
"EPRIS Museum": ("EPRIS Museum", "EPRIS Museum", "EPRIS Museum"),
"web": ("web", "web", "Web"),
"A free online museum of 583 public-domain and openly licensed works, with an open call for living artists.": (
    "Un museo online gratuito di 583 opere di pubblico dominio e con licenza aperta, con un invito aperto agli artisti viventi.",
    "Un musée en ligne gratuit de 583 œuvres du domaine public et sous licence libre, avec un appel ouvert aux artistes vivants.",
    "Ein kostenloses Online-Museum mit 583 gemeinfreien und offen lizenzierten Werken, mit offenem Aufruf an lebende Künstlerinnen und Künstler."),
"47 measured drawings of Italian buildings and seven courses, in English, Italian and Russian.": (
    "47 disegni misurati di edifici italiani e sette corsi, in inglese, italiano e russo.",
    "47 relevés dessinés de bâtiments italiens et sept cours, en anglais, italien et russe.",
    "47 vermessene Zeichnungen italienischer Bauten und sieben Kurse, auf Englisch, Italienisch und Russisch."),
"Teacher workspace: editable lessons, worksheets, YouTube as class material and classroom games.": (
    "Spazio di lavoro per insegnanti: lezioni modificabili, schede di lavoro, YouTube come materiale didattico e giochi per la classe.",
    "Espace de travail pour enseignants : leçons modifiables, fiches d’exercices, YouTube comme support de cours et jeux de classe.",
    "Arbeitsraum für Lehrkräfte: bearbeitbare Lektionen, Arbeitsblätter, YouTube als Unterrichtsmaterial und Klassenspiele."),
"web · open source": ("web · open source", "web · open source", "Web · Open Source"),
"Relational modeller for Oracle with DDL import and export and an SQL sandbox, no build step.": (
    "Modellatore relazionale per Oracle con import ed export DDL e una sandbox SQL, senza fase di build.",
    "Modeleur relationnel pour Oracle avec import et export DDL et un bac à sable SQL, sans étape de build.",
    "Relationaler Modellierer für Oracle mit DDL-Import und -Export und einer SQL-Sandbox, ohne Build-Schritt."),
"Catalogue, stock import and record linkage for a clothing retailer, correct under concurrent writers.": (
    "Catalogo, importazione delle giacenze e collegamento dei record per un rivenditore di abbigliamento, corretti anche con scritture concorrenti.",
    "Catalogue, import des stocks et liaison d’enregistrements pour un détaillant de vêtements, justes même sous écritures concurrentes.",
    "Katalog, Bestandsimport und Datensatzverknüpfung für einen Bekleidungshändler, korrekt auch bei gleichzeitigen Schreibzugriffen."),
"29 peer-reviewed papers, 2021–2026, mostly in Scopus-indexed proceedings; cited 70+ times, including in": (
    "29 articoli con revisione paritaria, 2021–2026, per lo più in atti indicizzati in Scopus; citati più di 70 volte, anche in",
    "29 articles évalués par les pairs, 2021–2026, surtout dans des actes indexés par Scopus ; cités plus de 70 fois, notamment dans",
    "29 begutachtete Beiträge, 2021–2026, überwiegend in Scopus-indizierten Tagungsbänden; über 70-mal zitiert, unter anderem in"),
". Full list:": (". Elenco completo:", ". Liste complète :", ". Vollständige Liste:"),
"Intellectual property": ("Proprietà intellettuale", "Propriété intellectuelle", "Geistiges Eigentum"),
"Certificate of copyright registration No. 142485: software “Software complex for intelligent assessment of financial risks based on fuzzy logic and Boolean minimisation” (“Fuzzy risk assessment system”)": (
    "Certificato di registrazione del diritto d’autore n. 142485: software «Complesso software per la valutazione intelligente dei rischi finanziari basato sulla logica fuzzy e sulla minimizzazione booleana» («Sistema di valutazione del rischio fuzzy»)",
    "Certificat d’enregistrement du droit d’auteur n° 142485 : logiciel « Ensemble logiciel d’évaluation intelligente des risques financiers fondé sur la logique floue et la minimisation booléenne » (« Système d’évaluation floue des risques »)",
    "Urheberrechtsregistrierung Nr. 142485: Software „Softwarekomplex zur intelligenten Bewertung finanzieller Risiken auf Grundlage von Fuzzy-Logik und Boolescher Minimierung“ („System zur Fuzzy-Risikobewertung“)"),
"Ukrainian National Office of Intellectual Property and Innovation · registered 12 February 2026 · author and sole owner of the economic rights": (
    "Ufficio nazionale ucraino per la proprietà intellettuale e l’innovazione · registrato il 12 febbraio 2026 · autore e unico titolare dei diritti patrimoniali",
    "Office national ukrainien de la propriété intellectuelle et de l’innovation · enregistré le 12 février 2026 · auteur et unique titulaire des droits patrimoniaux",
    "Ukrainisches Nationales Amt für geistiges Eigentum und Innovation · registriert am 12. Februar 2026 · Autor und alleiniger Inhaber der wirtschaftlichen Rechte"),
"Skills": ("Competenze", "Compétences", "Fähigkeiten"),
"Long-form writing and interviewing, structural and line editing, fact-checking, issue planning, print production, picture research, Creative Commons and rights clearance.": (
    "Scrittura e interviste di approfondimento, editing strutturale e di riga, fact-checking, pianificazione dei numeri, produzione di stampa, ricerca iconografica, Creative Commons e gestione dei diritti.",
    "Écriture et entretiens de fond, édition structurelle et de ligne, vérification des faits, planification des numéros, production imprimée, recherche iconographique, Creative Commons et clarification des droits.",
    "Langform-Schreiben und -Interviews, struktureller und Zeilenlektorat, Faktenprüfung, Ausgabenplanung, Printproduktion, Bildrecherche, Creative Commons und Rechteklärung."),
"Product": ("Prodotto", "Produit", "Produkt"),
"Discovery, strategy, information architecture, service design, UX direction, roadmaps, requirements, QA and launch.": (
    "Discovery, strategia, architettura dell’informazione, service design, direzione UX, roadmap, requisiti, QA e lancio.",
    "Découverte, stratégie, architecture de l’information, design de services, direction UX, feuilles de route, besoins, assurance qualité et lancement.",
    "Discovery, Strategie, Informationsarchitektur, Service Design, UX-Leitung, Roadmaps, Anforderungen, QA und Launch."),
"Technical": ("Tecniche", "Techniques", "Technik"),
"Swift and SwiftUI, TypeScript, Python, SQL (PostgreSQL, SQLite, Oracle), React and Next.js, REST APIs, LLM integrations, Linux, Docker, CI/CD.": (
    "Swift e SwiftUI, TypeScript, Python, SQL (PostgreSQL, SQLite, Oracle), React e Next.js, API REST, integrazioni LLM, Linux, Docker, CI/CD.",
    "Swift et SwiftUI, TypeScript, Python, SQL (PostgreSQL, SQLite, Oracle), React et Next.js, API REST, intégrations LLM, Linux, Docker, CI/CD.",
    "Swift und SwiftUI, TypeScript, Python, SQL (PostgreSQL, SQLite, Oracle), React und Next.js, REST-APIs, LLM-Integrationen, Linux, Docker, CI/CD."),
"Languages": ("Lingue", "Langues", "Sprachen"),
"Ukrainian (native), English (B1), German (B1), Polish (A2), Italian (A1).": (
    "Ucraino (madrelingua), inglese (B1), tedesco (B1), polacco (A2), italiano (A1).",
    "Ukrainien (langue maternelle), anglais (B1), allemand (B1), polonais (A2), italien (A1).",
    "Ukrainisch (Muttersprache), Englisch (B1), Deutsch (B1), Polnisch (A2), Italienisch (A1)."),
"Updated October 2026 · munister.com.ua/cv.html": (
    "Aggiornato a ottobre 2026 · munister.com.ua/cv.html",
    "Mis à jour en octobre 2026 · munister.com.ua/cv.html",
    "Stand Oktober 2026 · munister.com.ua/cv.html"),
}

MONTHS = {
    "it": ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"],
    "fr": ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."],
    "de": ["Jan.","Feb.","März","Apr.","Mai","Juni","Juli","Aug.","Sept.","Okt.","Nov.","Dez."],
}
LANGS = {
    "it": dict(name="Italiano", short="IT", locale="it_IT", idx=0),
    "fr": dict(name="Français", short="FR", locale="fr_FR", idx=1),
    "de": dict(name="Deutsch", short="DE", locale="de_DE", idx=2),
}
