<p align="center">
  <img src="assets/banner.svg" alt="Copero99: a Copero career simulator extension" width="100%">
</p>

<p align="center">
  <a href="CHANGELOG.md"><img alt="Version 1.0.0" src="https://img.shields.io/badge/version-1.0.0-3b82f6?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-34d399?style=flat-square"></a>
  <img alt="Works on desktop and mobile" src="https://img.shields.io/badge/works%20on-desktop%20%7C%20mobile-facc15?style=flat-square">
  <img alt="Userscript" src="https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20Violentmonkey%20%7C%20Userscripts-a78bfa?style=flat-square">
</p>

<p align="center">
  Copero99 is a free browser add-on for <a href="https://copero.com.ar/juegos/simulador-carrera">Copero's football career simulator</a>.
</p>

<p align="center">
  <a href="#install"><b>Install</b></a> ·
  <a href="#features">Features</a> ·
  <a href="#faq">FAQ</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

## Install

You need a free browser extension that runs scripts like Copero99. Setting it up takes about a minute.

### 1. Add the extension

Pick your browser:

- **Chrome, Edge, Brave or Opera:** add [Tampermonkey](https://www.tampermonkey.net/).
- **Firefox:** add [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/).
- **Android:** install Firefox from the Play Store, then add [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) to it.
- **iPhone, iPad or Mac:** install the free [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) app. Open it once and choose a folder, then turn it on in **Settings → Apps → Safari → Extensions**.

> [!IMPORTANT]
> On Chrome and Edge, Tampermonkey also needs one switch. Go to `chrome://extensions` (or `edge://extensions`), click **Details** under Tampermonkey and turn on **Allow user scripts**.

### 2. Add Copero99

Click **[Install Copero99](https://github.com/chirpthecool/Copero99/releases/latest/download/copero99.user.js)**, then click **Install** on the page that opens. Copero99 updates itself after that.

### 3. Play

Open the [career simulator](https://copero.com.ar/juegos/simulador-carrera) and start a career. The Copero99 panel opens by itself, and you choose Boost, Sandbox or Vanilla before your first season.

To open or close the panel later, click the diamond button next to your shirt number.

<details>
<summary>The install link only shows code</summary>

Download `copero99.user.js` from the [latest release](../../releases/latest) and open it in a text editor. In Tampermonkey, click **Create a new script**, replace the example code with the file's contents and save. A script added this way doesn't update itself, so use the install link when you can.

</details>

## Features

### Modes

Pick one before the first season. It stays for the whole career.

| Mode | What it does | Hall of Fame |
|---|---|:---:|
| **Boost** | Rolls a hidden talent: one of 11 levels from *Journeyman* to *The Chosen One*, a career style, perks and playing traits. Revealed when you retire. | ✅ |
| **Sandbox** | OVR 99 or your own growth curve, better club offers, no injuries or bans, retire any time, go back in time. | ❌ |
| **Vanilla** | Copero's own rules, plus the Living world and the Hall of Fame. | ✅ |

### Living world
- Your club's full season under the game card: league table, cup, continental cup, Club World Cup
- Club reputations rise and fall with results
- Real managers from Wikipedia, who get sacked, hired and poached
- Real promotion and relegation rules, including play-offs
- Your country's caps, call-ups and tournaments

### Awards
- Ballon d'Or voted against the season's stars, with your placing every year
- Golden Boot weighted by league strength
- Golden Glove for goalkeepers

### Career
- Transfer offers based on club needs and form
- Release clauses, contracts, club fit and bans
- Captain's armband
- Retire your way: now, a farewell season, a last dance or a homecoming
- Careers past 40

### Hall of Fame
- Save finished careers as FIFA-style cards, from Bronze to Icon and National Hero
- Titles, traits, clubs and a season-by-season table

### Extras
- Themes and fonts, including one in your club's colours
- Random country, position, shirt number and foot on the name screen
- Achievement progress in Copero's achievements window

## Building from source

The code is split into parts in [`src/`](src), in the order they run. [`build.js`](build.js) joins them into the single userscript:

```
node build.js
```

That writes `dist/copero99.user.js`, the same file the releases contain. It needs [Node.js](https://nodejs.org) and nothing else.

## FAQ

<details>
<summary><b>Nothing happens on the Copero page.</b></summary>

- Make sure the script is turned on in your userscript manager.
- On Chrome and Edge, check that **Allow user scripts** is on (see [step 1](#1-add-the-extension)).
- Reload the page. The panel only appears during a career, not on the start screen.

</details>

<details>
<summary><b>Will it change my Copero account or achievements?</b></summary>

Copero99 only changes what you see in your own browser. Copero saves achievements to your account when you're logged in, and only Vanilla careers can unlock them. Achievements from a Boost or Sandbox career are never sent to your account.

</details>

<details>
<summary><b>Does it collect any data?</b></summary>

No. Copero99 has no servers and sends nothing anywhere. Your settings and Hall of Fame are stored in your browser. It only loads files that Copero's page already uses (the game file and club crests), plus Google Fonts if you pick a font.

</details>

<details>
<summary><b>Why can't my Sandbox career go into the Hall of Fame?</b></summary>

The Hall of Fame only takes careers that Copero decided: Boost careers with the talent they rolled, and Vanilla careers.

</details>

<details>
<summary><b>I found a bug or have an idea.</b></summary>

Please [open an issue](../../issues/new/choose). A screenshot helps a lot, and so does the data from the gear menu's **Inspect data**.

</details>

## Credits

- Built for [Copero](https://copero.com.ar)'s career simulator. Copero99 is a fan project, made without any involvement from Copero. All club names, crests and trophies come from Copero's own page.
- Manager and player lists from [Wikipedia](https://en.wikipedia.org), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Icons from [Lucide](https://lucide.dev).

## License

Copero99 is released under the [MIT License](LICENSE). The Wikipedia-based data inside it is under CC BY-SA 4.0 (see [LICENSE](LICENSE)).
