import Link from "next/link";
import { getLocale } from "next-intl/server";

export const metadata = {
  title: "Terms & Conditions · Street Dog",
};

type Block = { type: "p"; text: string } | { type: "ul"; items: string[] };

interface Section {
  title: string;
  blocks: Block[];
}

interface TermsContent {
  title: string;
  intro: string;
  lastUpdated: string;
  back: string;
  footer: string;
  sections: Section[];
}

// Long-form legal copy lives here as structured data (one entry per locale)
// rather than in the i18n message JSON — paragraphs, lists, and **bold**
// emphasis read far better as TS than as escaped JSON strings. **double
// asterisks** mark inline bold (see renderInline below).
const TERMS: Record<string, TermsContent> = {
  en: {
    title: "Terms & Conditions",
    intro: "Please read this before you sign up and start logging street dogs.",
    lastUpdated: "Last updated: 11 June 2026",
    back: "← Back",
    footer:
      "By creating an account you confirm that you have read and agree to these Terms.",
    sections: [
      {
        title: "1. Acceptance of terms",
        blocks: [
          {
            type: "p",
            text: "These Terms & Conditions ('Terms') are an agreement between you and The Street Dog App ('Street Dog', 'we', 'us'). By creating an account or using the app, you agree to these Terms. If you don't agree, please don't use the app.",
          },
        ],
      },
      {
        title: "2. Who can use the app",
        blocks: [
          {
            type: "p",
            text: "You must be at least 13 years old, or the minimum age required in your country, to use Street Dog. If you are under 18, you confirm that a parent or guardian is aware that you use the app. By using it, you confirm you can form a binding agreement with us.",
          },
        ],
      },
      {
        title: "3. Your account",
        blocks: [
          {
            type: "p",
            text: "You are responsible for your account and for keeping your password safe. Give accurate information when you sign up, and don't share your login or pretend to be someone else. Tell us right away if you think someone else is using your account. You are responsible for everything that happens under your account.",
          },
        ],
      },
      {
        title: "4. Acceptable use",
        blocks: [
          { type: "p", text: "You agree not to:" },
          {
            type: "ul",
            items: [
              "break any law, or use the app for anything illegal;",
              "harass, threaten, or abuse other people, or harm animals in any way;",
              "upload content that is false, misleading, hateful, sexual, violent, or that you don't have the right to share;",
              "impersonate anyone, or post another person's private information;",
              "try to break, overload, scrape, reverse-engineer, or get unauthorised access to the app or its data;",
              "use bots or fake activity to game points, levels, or the leaderboard.",
            ],
          },
        ],
      },
      {
        title: "5. Your content and the licence you give us",
        blocks: [
          {
            type: "p",
            text: "You keep ownership of the photos, notes, and other content you add ('Your Content'). By adding it, you give us a worldwide, non-exclusive, royalty-free licence to store, display, and share Your Content inside the app so it can do its job — helping the community find and care for street dogs. You confirm you have the right to share what you upload, and that it doesn't break anyone else's rights.",
          },
        ],
      },
      {
        title: "6. Our intellectual property",
        blocks: [
          {
            type: "p",
            text: "The app itself — its name, logo, design, and software — belongs to us or our licensors. These Terms don't give you any right to copy, resell, or reuse them beyond normal use of the app.",
          },
        ],
      },
      {
        title: "7. Third-party services",
        blocks: [
          {
            type: "p",
            text: "The app relies on third-party services (for example map tiles and hosting). We don't control them and aren't responsible for them. Map locations are approximate and may be inaccurate.",
          },
        ],
      },
      {
        title: '8. The app is provided "as is"',
        blocks: [
          {
            type: "p",
            text: "We provide the app as it is, without warranties of any kind. We don't promise it will always be available, accurate, error-free, or secure, and we don't guarantee any particular result from using it.",
          },
        ],
      },
      {
        title: "9. Limitation of liability",
        blocks: [
          {
            type: "p",
            text: "To the fullest extent allowed by law, Street Dog and the people behind it are not liable for any indirect, incidental, or consequential loss, or for any loss of data, arising from your use of the app. This is in addition to the safety terms in section 13 below.",
          },
        ],
      },
      {
        title: "10. Suspension and termination",
        blocks: [
          {
            type: "p",
            text: "You can stop using the app and delete your data at any time. We may suspend or remove content or accounts that break these Terms or harm other users, animals, or the service.",
          },
        ],
      },
      {
        title: "11. Changes to these terms",
        blocks: [
          {
            type: "p",
            text: "We may update these Terms from time to time. If we make important changes, we'll let you know in the app. Continuing to use Street Dog after a change means you accept the updated Terms.",
          },
        ],
      },
      {
        title: "12. Governing law",
        blocks: [
          {
            type: "p",
            text: "These Terms are governed by the laws of Georgia, without regard to its conflict-of-law rules.",
          },
        ],
      },
      {
        title: "13. Safety — handling street dogs",
        blocks: [
          {
            type: "p",
            text: "Street Dog is a tool for spotting and logging street dogs. It is not a tool for handling them. The app and the people behind it are **not responsible** for anything that happens to you, another person, or an animal while you use it — including, but not limited to, dog bites, scratches, injuries, illness, or property damage.",
          },
          {
            type: "p",
            text: "You take part entirely at your own risk. Keep a safe distance from any dog. You are **never** asked to touch, feed, corner, chase, pick up, or otherwise interact with a dog in any way that could be dangerous to you or to the animal. If a dog seems scared, hurt, or aggressive, stay back and report it instead of approaching it. Always use common sense and follow local laws.",
          },
        ],
      },
      {
        title: "14. Data you share",
        blocks: [
          {
            type: "p",
            text: "To make the app work, some of your information is shared with other users and shown publicly in the app:",
          },
          {
            type: "ul",
            items: [
              "Your **username (nickname)** — for example next to dogs you registered and on the leaderboard.",
              "The **dog data points** you create — the dogs you log, their photos, locations, and sighting details — are shared so the whole community can find and help those dogs.",
            ],
          },
          {
            type: "p",
            text: "Your email and password are never shown to other users. You can export or delete your dog data at any time from your account settings.",
          },
        ],
      },
      {
        title: "15. Contact",
        blocks: [
          {
            type: "p",
            text: "Questions about these Terms? Reach us through the **Report a Problem** or **Support** screen in the app.",
          },
        ],
      },
    ],
  },

  ka: {
    title: "წესები და პირობები",
    intro:
      "გთხოვთ, წაიკითხოთ ეს რეგისტრაციამდე და ქუჩის ძაღლების აღრიცხვის დაწყებამდე.",
    lastUpdated: "ბოლო განახლება: 2026 წლის 11 ივნისი",
    back: "← უკან",
    footer:
      "ანგარიშის შექმნით თქვენ ადასტურებთ, რომ წაიკითხეთ და ეთანხმებით ამ პირობებს.",
    sections: [
      {
        title: "1. პირობების მიღება",
        blocks: [
          {
            type: "p",
            text: "ეს წესები და პირობები („პირობები“) არის შეთანხმება თქვენსა და The Street Dog App-ს („Street Dog“, „ჩვენ“) შორის. ანგარიშის შექმნით ან აპის გამოყენებით თქვენ ეთანხმებით ამ პირობებს. თუ არ ეთანხმებით, გთხოვთ, არ ისარგებლოთ აპით.",
          },
        ],
      },
      {
        title: "2. ვის შეუძლია აპის გამოყენება",
        blocks: [
          {
            type: "p",
            text: "Street Dog-ის გამოსაყენებლად უნდა იყოთ მინიმუმ 13 წლის, ან თქვენს ქვეყანაში დადგენილი მინიმალური ასაკის. თუ 18 წელს არ მიგიღწევიათ, თქვენ ადასტურებთ, რომ მშობელმა ან მეურვემ იცის, რომ აპით სარგებლობთ. გამოყენებით თქვენ ადასტურებთ, რომ შეგიძლიათ ჩვენთან სავალდებულო შეთანხმების დადება.",
          },
        ],
      },
      {
        title: "3. თქვენი ანგარიში",
        blocks: [
          {
            type: "p",
            text: "თქვენ ხართ პასუხისმგებელი თქვენს ანგარიშზე და პაროლის უსაფრთხოდ შენახვაზე. რეგისტრაციისას მიუთითეთ ზუსტი ინფორმაცია, არ გააზიაროთ თქვენი ანგარიში და არ წარმოაჩინოთ თავი სხვა ადამიანად. დაუყოვნებლივ შეგვატყობინეთ, თუ ფიქრობთ, რომ თქვენი ანგარიშით სხვა სარგებლობს. თქვენ ხართ პასუხისმგებელი ყველაფერზე, რაც თქვენი ანგარიშით ხდება.",
          },
        ],
      },
      {
        title: "4. მისაღები გამოყენება",
        blocks: [
          { type: "p", text: "თქვენ თანხმდებით, რომ არ:" },
          {
            type: "ul",
            items: [
              "დაარღვევთ კანონს და არ გამოიყენებთ აპს უკანონო მიზნებისთვის;",
              "შეავიწროებთ, დაემუქრებით ან შეურაცხყოფთ სხვა ადამიანებს და არ ავნებთ ცხოველებს;",
              "ატვირთავთ კონტენტს, რომელიც ყალბი, შეცდომაში შემყვანი, სიძულვილის შემცველი, სექსუალური ან ძალადობრივია, ან რომლის გაზიარების უფლება არ გაქვთ;",
              "წარმოაჩენთ თავს სხვა პიროვნებად ან გამოაქვეყნებთ სხვისი პირადი ინფორმაციას;",
              "შეეცდებით აპის ან მისი მონაცემების გატეხვას, გადატვირთვას, მოპარვას (scraping), უკუ-ინჟინერიას ან არაავტორიზებულ წვდომას;",
              "გამოიყენებთ ბოტებს ან ყალბ აქტივობას ქულების, დონეების ან ლიდერბორდის გასაყალბებლად.",
            ],
          },
        ],
      },
      {
        title: "5. თქვენი კონტენტი და ლიცენზია, რომელსაც გვაძლევთ",
        blocks: [
          {
            type: "p",
            text: "თქვენ ინარჩუნებთ თქვენ მიერ დამატებული ფოტოების, ჩანაწერებისა და სხვა კონტენტის („თქვენი კონტენტი“) საკუთრებას. მისი დამატებით თქვენ გვაძლევთ მსოფლიო მასშტაბის, არაექსკლუზიურ, უსასყიდლო ლიცენზიას, შევინახოთ, ვაჩვენოთ და გავაზიაროთ თქვენი კონტენტი აპის შიგნით, რათა მან შეასრულოს თავისი დანიშნულება — დაეხმაროს საზოგადოებას ქუჩის ძაღლების მოძებნასა და მოვლაში. თქვენ ადასტურებთ, რომ გაქვთ ატვირთული მასალის გაზიარების უფლება და რომ ის არ არღვევს სხვისი უფლებებს.",
          },
        ],
      },
      {
        title: "6. ჩვენი ინტელექტუალური საკუთრება",
        blocks: [
          {
            type: "p",
            text: "თავად აპი — მისი სახელი, ლოგო, დიზაინი და პროგრამული უზრუნველყოფა — ეკუთვნის ჩვენ ან ჩვენს ლიცენზიარებს. ეს პირობები არ გაძლევთ მათი კოპირების, გადაყიდვის ან ხელახლა გამოყენების უფლებას აპის ჩვეულებრივი გამოყენების ფარგლებს გარეთ.",
          },
        ],
      },
      {
        title: "7. მესამე მხარის სერვისები",
        blocks: [
          {
            type: "p",
            text: "აპი ეყრდნობა მესამე მხარის სერვისებს (მაგალითად, რუკის ფენებსა და ჰოსტინგს). ჩვენ მათ არ ვაკონტროლებთ და არ ვართ მათზე პასუხისმგებელი. რუკაზე მდებარეობები მიახლოებითია და შესაძლოა არაზუსტი იყოს.",
          },
        ],
      },
      {
        title: "8. აპი მოწოდებულია „როგორც არის“",
        blocks: [
          {
            type: "p",
            text: "ჩვენ გაწვდით აპს ისეთს, როგორიც არის, ყოველგვარი გარანტიის გარეშე. ჩვენ არ გპირდებით, რომ ის ყოველთვის ხელმისაწვდომი, ზუსტი, შეცდომებისგან თავისუფალი ან უსაფრთხო იქნება და არ ვიძლევით გარანტიას რაიმე კონკრეტულ შედეგზე.",
          },
        ],
      },
      {
        title: "9. პასუხისმგებლობის შეზღუდვა",
        blocks: [
          {
            type: "p",
            text: "კანონით დაშვებული მაქსიმალური ფარგლებში, Street Dog და მის უკან მდგომი ადამიანები არ არიან პასუხისმგებელი რაიმე ირიბ, შემთხვევით ან თანმდევ ზიანზე, ან მონაცემთა დაკარგვაზე, რომელიც წარმოიქმნება აპის გამოყენებით. ეს ემატება ქვემოთ მე-13 ნაწილში მოცემულ უსაფრთხოების პირობებს.",
          },
        ],
      },
      {
        title: "10. შეჩერება და შეწყვეტა",
        blocks: [
          {
            type: "p",
            text: "თქვენ ნებისმიერ დროს შეგიძლიათ შეწყვიტოთ აპის გამოყენება და წაშალოთ თქვენი მონაცემები. ჩვენ შეგვიძლია შევაჩეროთ ან წავშალოთ კონტენტი ან ანგარიშები, რომლებიც არღვევენ ამ პირობებს ან ვნებენ სხვა მომხმარებლებს, ცხოველებს ან სერვისს.",
          },
        ],
      },
      {
        title: "11. ცვლილებები პირობებში",
        blocks: [
          {
            type: "p",
            text: "ჩვენ შესაძლოა დროდადრო განვაახლოთ ეს პირობები. მნიშვნელოვანი ცვლილებების შემთხვევაში შეგატყობინებთ აპში. Street Dog-ის გამოყენების გაგრძელება ცვლილების შემდეგ ნიშნავს, რომ ეთანხმებით განახლებულ პირობებს.",
          },
        ],
      },
      {
        title: "12. მოქმედი კანონმდებლობა",
        blocks: [
          {
            type: "p",
            text: "ეს პირობები რეგულირდება საქართველოს კანონმდებლობით, კოლიზიური ნორმების გათვალისწინების გარეშე.",
          },
        ],
      },
      {
        title: "13. უსაფრთხოება — ქუჩის ძაღლებთან მოპყრობა",
        blocks: [
          {
            type: "p",
            text: "Street Dog არის ხელსაწყო ქუჩის ძაღლების შესამჩნევად და აღსარიცხად. ის არ არის ხელსაწყო მათთან ფიზიკური მოპყრობისთვის. აპი და მის უკან მდგომი ადამიანები **არ არიან პასუხისმგებელი** იმაზე, რაც აპის გამოყენებისას შეიძლება დაგემართოთ თქვენ, სხვა ადამიანს ან ცხოველს — მათ შორის, მაგრამ არა მხოლოდ, ძაღლის კბენაზე, ნაკაწრებზე, ტრავმებზე, ავადმყოფობაზე ან ქონების დაზიანებაზე.",
          },
          {
            type: "p",
            text: "თქვენ მონაწილეობთ მთლიანად საკუთარი რისკით. დაიცავით უსაფრთხო დისტანცია ნებისმიერ ძაღლთან. თქვენ **არასოდეს** გთხოვენ ძაღლის შეხებას, კვებას, კუთხეში მოქცევას, დევნას, აყვანას ან მასთან რაიმე სახიფათო ფორმით ურთიერთობას, რაც საფრთხეს შეუქმნის თქვენ ან ცხოველს. თუ ძაღლი შეშინებული, დაშავებული ან აგრესიულია, დარჩით მოშორებით და მიახლოების ნაცვლად შეატყობინეთ. ყოველთვის გამოიყენეთ საღი აზრი და დაიცავით ადგილობრივი კანონები.",
          },
        ],
      },
      {
        title: "14. მონაცემები, რომლებსაც აზიარებთ",
        blocks: [
          {
            type: "p",
            text: "აპის მუშაობისთვის თქვენი ზოგიერთი ინფორმაცია უზიარდება სხვა მომხმარებლებს და საჯაროდ ჩანს აპში:",
          },
          {
            type: "ul",
            items: [
              "თქვენი **მომხმარებლის სახელი (მეტსახელი)** — მაგალითად, თქვენ მიერ რეგისტრირებული ძაღლების გვერდით და ლიდერბორდზე.",
              "**ძაღლების მონაცემები**, რომლებსაც ქმნით — აღრიცხული ძაღლები, მათი ფოტოები, მდებარეობები და დაკვირვების დეტალები — ზიარდება, რათა მთელმა საზოგადოებამ შეძლოს ამ ძაღლების მოძებნა და დახმარება.",
            ],
          },
          {
            type: "p",
            text: "თქვენი ელფოსტა და პაროლი არასოდეს ეჩვენება სხვა მომხმარებლებს. თქვენ ნებისმიერ დროს შეგიძლიათ ექსპორტი გაუკეთოთ ან წაშალოთ თქვენი ძაღლების მონაცემები ანგარიშის პარამეტრებიდან.",
          },
        ],
      },
      {
        title: "15. კონტაქტი",
        blocks: [
          {
            type: "p",
            text: "გაქვთ შეკითხვები ამ პირობებთან დაკავშირებით? დაგვიკავშირდით აპის **„პრობლემის მოხსენება“** ან **„მხარდაჭერა“** გვერდიდან.",
          },
        ],
      },
    ],
  },

  ru: {
    title: "Условия использования",
    intro:
      "Пожалуйста, прочитайте это перед регистрацией и началом учёта уличных собак.",
    lastUpdated: "Последнее обновление: 11 июня 2026 г.",
    back: "← Назад",
    footer:
      "Создавая аккаунт, вы подтверждаете, что прочитали и согласны с этими Условиями.",
    sections: [
      {
        title: "1. Принятие условий",
        blocks: [
          {
            type: "p",
            text: "Эти Условия использования («Условия») — соглашение между вами и The Street Dog App («Street Dog», «мы»). Создавая аккаунт или используя приложение, вы соглашаетесь с этими Условиями. Если вы не согласны, пожалуйста, не пользуйтесь приложением.",
          },
        ],
      },
      {
        title: "2. Кто может пользоваться приложением",
        blocks: [
          {
            type: "p",
            text: "Чтобы пользоваться Street Dog, вам должно быть не менее 13 лет или минимального возраста, установленного в вашей стране. Если вам ещё нет 18, вы подтверждаете, что родитель или опекун знает о том, что вы пользуетесь приложением. Используя его, вы подтверждаете, что можете заключить с нами обязывающее соглашение.",
          },
        ],
      },
      {
        title: "3. Ваш аккаунт",
        blocks: [
          {
            type: "p",
            text: "Вы отвечаете за свой аккаунт и за сохранность пароля. Указывайте при регистрации достоверные данные, не передавайте свой логин и не выдавайте себя за другого человека. Сразу сообщите нам, если считаете, что вашим аккаунтом пользуется кто-то ещё. Вы несёте ответственность за всё, что происходит под вашим аккаунтом.",
          },
        ],
      },
      {
        title: "4. Допустимое использование",
        blocks: [
          { type: "p", text: "Вы соглашаетесь не:" },
          {
            type: "ul",
            items: [
              "нарушать закон и не использовать приложение в незаконных целях;",
              "преследовать, угрожать или оскорблять других людей и не причинять вред животным;",
              "загружать контент, который является ложным, вводящим в заблуждение, разжигающим ненависть, сексуальным, жестоким или которым у вас нет права делиться;",
              "выдавать себя за кого-либо и не публиковать чужую личную информацию;",
              "пытаться взломать, перегрузить, скрапить, реконструировать или получить несанкционированный доступ к приложению или его данным;",
              "использовать ботов или фальшивую активность, чтобы накручивать очки, уровни или таблицу лидеров.",
            ],
          },
        ],
      },
      {
        title: "5. Ваш контент и предоставляемая лицензия",
        blocks: [
          {
            type: "p",
            text: "Вы сохраняете право собственности на фотографии, заметки и другой контент, который добавляете («Ваш контент»). Добавляя его, вы предоставляете нам всемирную, неисключительную, безвозмездную лицензию хранить, показывать и распространять Ваш контент внутри приложения, чтобы оно выполняло свою задачу — помогать сообществу находить уличных собак и заботиться о них. Вы подтверждаете, что имеете право делиться загружаемым материалом и что он не нарушает прав других лиц.",
          },
        ],
      },
      {
        title: "6. Наша интеллектуальная собственность",
        blocks: [
          {
            type: "p",
            text: "Само приложение — его название, логотип, дизайн и программное обеспечение — принадлежит нам или нашим лицензиарам. Эти Условия не дают вам права копировать, перепродавать или повторно использовать их за пределами обычного использования приложения.",
          },
        ],
      },
      {
        title: "7. Сторонние сервисы",
        blocks: [
          {
            type: "p",
            text: "Приложение использует сторонние сервисы (например, картографические слои и хостинг). Мы их не контролируем и не несём за них ответственности. Местоположения на карте являются приблизительными и могут быть неточными.",
          },
        ],
      },
      {
        title: "8. Приложение предоставляется «как есть»",
        blocks: [
          {
            type: "p",
            text: "Мы предоставляем приложение таким, какое оно есть, без каких-либо гарантий. Мы не обещаем, что оно всегда будет доступным, точным, без ошибок или безопасным, и не гарантируем какого-либо конкретного результата от его использования.",
          },
        ],
      },
      {
        title: "9. Ограничение ответственности",
        blocks: [
          {
            type: "p",
            text: "В максимально допустимой законом степени Street Dog и люди, стоящие за ним, не несут ответственности за любой косвенный, случайный или последующий ущерб, а также за потерю данных, возникшие из-за использования приложения. Это дополняет условия безопасности в разделе 13 ниже.",
          },
        ],
      },
      {
        title: "10. Приостановка и прекращение",
        blocks: [
          {
            type: "p",
            text: "Вы можете в любой момент прекратить пользоваться приложением и удалить свои данные. Мы можем приостановить или удалить контент или аккаунты, нарушающие эти Условия или причиняющие вред другим пользователям, животным или сервису.",
          },
        ],
      },
      {
        title: "11. Изменения условий",
        blocks: [
          {
            type: "p",
            text: "Мы можем время от времени обновлять эти Условия. При важных изменениях мы сообщим вам в приложении. Продолжение использования Street Dog после изменения означает, что вы принимаете обновлённые Условия.",
          },
        ],
      },
      {
        title: "12. Применимое право",
        blocks: [
          {
            type: "p",
            text: "Эти Условия регулируются законодательством Грузии, без учёта его коллизионных норм.",
          },
        ],
      },
      {
        title: "13. Безопасность — обращение с уличными собаками",
        blocks: [
          {
            type: "p",
            text: "Street Dog — это инструмент для обнаружения и учёта уличных собак. Это не инструмент для обращения с ними. Приложение и люди, стоящие за ним, **не несут ответственности** за то, что может случиться с вами, другим человеком или животным во время использования приложения, — включая, но не ограничиваясь укусами собак, царапинами, травмами, болезнями или порчей имущества.",
          },
          {
            type: "p",
            text: "Вы участвуете полностью на свой страх и риск. Держите безопасную дистанцию от любой собаки. Вас **никогда** не просят трогать, кормить, загонять в угол, преследовать, поднимать собаку или взаимодействовать с ней любым способом, который может быть опасен для вас или животного. Если собака напугана, ранена или агрессивна, держитесь в стороне и сообщите о ней вместо того, чтобы приближаться. Всегда руководствуйтесь здравым смыслом и соблюдайте местные законы.",
          },
        ],
      },
      {
        title: "14. Данные, которыми вы делитесь",
        blocks: [
          {
            type: "p",
            text: "Чтобы приложение работало, часть вашей информации становится доступной другим пользователям и публично отображается в приложении:",
          },
          {
            type: "ul",
            items: [
              "Ваше **имя пользователя (никнейм)** — например, рядом с собаками, которых вы зарегистрировали, и в таблице лидеров.",
              "**Данные о собаках**, которые вы создаёте, — собаки, которых вы регистрируете, их фотографии, местоположения и детали наблюдений — публикуются, чтобы всё сообщество могло находить этих собак и помогать им.",
            ],
          },
          {
            type: "p",
            text: "Ваша электронная почта и пароль никогда не показываются другим пользователям. Вы можете в любой момент экспортировать или удалить данные о ваших собаках в настройках аккаунта.",
          },
        ],
      },
      {
        title: "15. Контакт",
        blocks: [
          {
            type: "p",
            text: "Вопросы об этих Условиях? Свяжитесь с нами через экран **«Сообщить о проблеме»** или **«Поддержка»** в приложении.",
          },
        ],
      },
    ],
  },
};

// Lightweight inline-bold renderer: turns **text** into <strong>text</strong>.
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = TERMS[locale] ?? TERMS.en;

  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <Link
        href="/register"
        className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink no-underline"
      >
        {t.back}
      </Link>

      <h1 className="text-[28px] font-bold tracking-[-0.02em] mt-4 mb-1">
        {t.title}
      </h1>
      <p className="text-sm text-muted-foreground mb-1">{t.intro}</p>
      <p className="text-xs text-muted-foreground mb-8">{t.lastUpdated}</p>

      <section className="space-y-6 text-[15px] leading-relaxed text-ink">
        {t.sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
            {section.blocks.map((block, i) =>
              block.type === "p" ? (
                <p key={i} className={i > 0 ? "mt-2" : undefined}>
                  {renderInline(block.text)}
                </p>
              ) : (
                <ul
                  key={i}
                  className={`list-disc pl-5 space-y-1 ${i > 0 ? "mt-2" : ""}`}
                >
                  {block.items.map((item, j) => (
                    <li key={j}>{renderInline(item)}</li>
                  ))}
                </ul>
              )
            )}
          </div>
        ))}

        <p className="text-sm text-muted-foreground pt-4">{t.footer}</p>
      </section>
    </main>
  );
}
