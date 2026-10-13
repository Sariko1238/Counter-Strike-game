/**
 * Counter-Strike 1.6 / GO Bilingual Localization Engine (RU / EN)
 * Seamlessly manages dynamic real-time translations for UI, HUD, Radio, Scoreboard, and Buy Menu.
 */

const CS_TRANSLATIONS = {
  ru: {
    // Top Bar & Meta
    game_title: 'COUNTER-STRIKE <span>GO</span>',
    game_subtitle: 'РЕЖИМ «1 ПРОТИВ 5» • 3D LOBBY SHOWCASE',
    play_btn: 'В БОЙ (PLAY)',
    resume_btn: 'ПРОДОЛЖИТЬ (RESUME)',
    restart_btn: 'НАЧАТЬ ЗАНОВО',

    // Team Selection
    team_selection_title: 'ВЫБОР СТОРОНЫ (TEAM SELECTION)',
    team_ct_title: '1 CT ПРОТИВ 5 T',
    team_ct_desc: 'Спецназ SAS. 5 врагов с бесконечным респавном.',
    team_t_title: '1 T ПРОТИВ 5 CT',
    team_t_desc: 'Террористы Phoenix. 5 спецназовцев с бесконечным респавном.',

    // Settings
    setting_map: 'Выбор Карты:',
    map_dust2: '🏜️ de_dust2 (Легендарный Даст 2)',
    map_beach: '🏖️ de_beach (Тропический курорт)',
    setting_difficulty: 'Сложность Ботов:',
    diff_easy: 'Легко (Easy)',
    diff_normal: 'Средне (Normal)',
    diff_hard: 'Профи (CS Veteran)',
    setting_enemies: 'Количество Врагов:',
    enemies_count: '5 Врагов (Режим 1 vs 5)',
    setting_sens: 'Чувствительность Мыши:',
    setting_vol: 'Громкость Звука:',

    // Customization & Skins
    customization_title: '🎨 КАСТОМИЗАЦИЯ И СКИНЫ',
    setting_char_skin: 'Скин Персонажа:',
    skin_char_default: '👮 Классический CS (Спецназ / Т)',
    skin_char_steve: '⛏️ Стив (Minecraft Steve)',
    skin_char_creeper: '💥 Крипер (Minecraft Creeper)',
    skin_char_diamond: '💎 Алмазный Стив (Diamond Armor)',
    setting_reticle: 'Стиль Прицела [H]:',
    reticle_red_dot: '🔴 Red Dot (Коллиматорная точка)',
    reticle_holographic: '⭕ EOTech (Голографический круг)',
    reticle_tactical_cross: '🟢 Tactical Cross (Тактический)',
    reticle_mil_dot: '🎯 Mil-Dot (Снайперский)',
    reticle_cs_classic: '➕ CS Classic (Динамический)',
    setting_awp_skin: 'Скин AWP:',
    awp_dragon_lore: '🐉 AWP | Dragon Lore (Дракон)',
    awp_default: 'Классический AWP',
    setting_ak_skin: 'Скин AK-47:',
    ak_asiimov: '⚡ AK-47 | Asiimov (Азимов)',
    ak_default: 'Классическое дерево',
    setting_m4_skin: 'Скин M4A1:',
    m4_howl: '🐺 M4A1 | Howl (Вой)',
    m4_default: 'Классический M4A1',
    setting_deagle_skin: 'Скин Deagle:',
    deagle_printstream: '✨ Deagle | Printstream (Перламутр)',
    deagle_default: 'Классическая сталь',
    setting_knife_skin: 'Скин Ножа:',
    knife_doppler: '🔮 Керамбит | Doppler Phase 2 & Fade',
    knife_default: 'Стандартный штык-нож',
    setting_scout_skin: 'Скин SSG 08:',
    scout_bloodsport: '🏎️ SSG 08 | Bloodsport (Спорт)',
    scout_default: 'Классический Scout',

    // Controls Guide
    controls_title: 'УПРАВЛЕНИЕ:',
    ctrl_movement: 'Движение',
    ctrl_fire: 'Стрельба / Удар',
    ctrl_zoom: 'Зум / Прицел ADS',
    ctrl_reload: 'Перезарядка',
    ctrl_jump: 'Прыжок / Респавн',
    ctrl_crouch: 'Присесть (кучность ↑)',
    ctrl_weapons: 'Оружие (5 = C4)',
    ctrl_buy: 'Магазин оружия',
    ctrl_score: 'Таблица счета',

    // Operative Card
    badge_team_ct: 'СПЕЦНАЗ (CT)',
    badge_team_t: 'ТЕРРОРИСТЫ (T)',
    badge_status: 'STATUS: READY FOR COMBAT',
    badge_wpn_m4: 'ВООРУЖЕНИЕ: M4A1 CARBINE',
    badge_wpn_ak: 'ВООРУЖЕНИЕ: AK-47 ASSAULT RIFLE',

    // In-game HUD
    bomb_planted: '💣 БОМБА ЗАЛОЖЕНА',
    shield_label: 'ЩИТ:',
    prompt_defuse: 'УДЕРЖИВАЙТЕ ДЛЯ ОБЕЗВРЕЖИВАНИЯ',
    prompt_plant: 'УДЕРЖИВАЙТЕ ДЛЯ УСТАНОВКИ БОМБЫ',
    action_defusing: 'РАЗМИНИРОВАНИЕ...',
    action_planting: 'УСТАНОВКА БОМБЫ...',

    // Death & Respawn
    death_title: 'ВЫ ПОГИБЛИ',
    death_killer: 'Убит противником',
    death_countdown_label: 'Автоматическое возрождение через:',
    death_sec: 'сек',
    death_btn: 'Возродиться сейчас (Respawn)',
    death_spectator: 'Режим «1 против 5» • Нажмите [ПРОБЕЛ] или [E] для немедленного возрождения',

    // Buy Menu
    buy_title: 'МАГАЗИН ОРУЖИЯ (BUY MENU)',
    buy_balance: 'Баланс:',
    buy_pistols: '1. ПИСТОЛЕТЫ',
    buy_rifles: '2. ВИНТОВКИ И СНАЙПЕРКИ',
    buy_equipment: '3. СНАРЯЖЕНИЕ',
    buy_armor: '1. Броня + Шлем',
    buy_he: '2. Осколочная граната HE',
    buy_kit: '3. Набор сапера (Defuse Kit)',
    buy_ammo: '4. Полный боекомплект',
    buy_footer: 'Нажмите [B] или [ESC] чтобы закрыть магазин',
    buy_no_money: 'Недостаточно денег для покупки!',

    // Scoreboard
    sb_title_beach: 'DE_BEACH - СЧЁТ МАТЧА',
    sb_title_dust2: 'DE_DUST2 - СЧЁТ МАТЧА',
    sb_subtitle: 'Counter-Strike 1.6 Dedicated Engine',
    sb_wins: 'ПОБЕД',
    sb_col_player: 'Игрок',
    sb_col_kills: 'Убийств',
    sb_col_deaths: 'Смертей',
    sb_col_status: 'Статус',
    sb_status_alive: 'Жив',
    sb_status_dead: 'Мёртв',

    // Announcements & Radio
    ct_win: 'COUNTER-TERRORISTS WIN',
    t_win: 'TERRORISTS WIN',
    bomb_defused_announcement: 'BOMB HAS BEEN DEFUSED',
    target_bombed_announcement: 'TARGET BOMBED & DESTROYED',
    reason_t_elim: 'Все террористы нейтрализованы',
    reason_ct_elim: 'Все спецназовцы уничтожены',
    radio_enemy_spotted: 'Враг замечен!',
    radio_bomb_planted: 'Бомба заложена!',
    radio_headshot: 'В ГОЛОВУ! (HEADSHOT)',
    radio_kill: 'Враг уничтожен',

    // Language Toggle
    lang_btn_text: '🌐 ЯЗЫК: РУС'
  },

  en: {
    // Top Bar & Meta
    game_title: 'COUNTER-STRIKE <span>GO</span>',
    game_subtitle: '«1 VS 5» COMBAT MODE • 3D LOBBY SHOWCASE',
    play_btn: 'PLAY (FIGHT)',
    resume_btn: 'RESUME MATCH',
    restart_btn: 'RESTART MATCH',

    // Team Selection
    team_selection_title: 'TEAM SELECTION',
    team_ct_title: '1 CT VS 5 T',
    team_ct_desc: 'SAS Special Forces. 5 enemies with infinite respawn.',
    team_t_title: '1 T VS 5 CT',
    team_t_desc: 'Phoenix Enforcers. 5 counter-terrorists with infinite respawn.',

    // Settings
    setting_map: 'Select Map:',
    map_dust2: '🏜️ de_dust2 (Iconic Dust II)',
    map_beach: '🏖️ de_beach (Tropical Resort)',
    setting_difficulty: 'Bot Difficulty:',
    diff_easy: 'Easy (Recruit)',
    diff_normal: 'Normal (Trooper)',
    diff_hard: 'Hard (CS Veteran)',
    setting_enemies: 'Enemy Bots:',
    enemies_count: '5 Enemies (1 vs 5 Mode)',
    setting_sens: 'Mouse Sensitivity:',
    setting_vol: 'Sound Volume:',

    // Customization & Skins
    customization_title: '🎨 CUSTOMIZATION & SKINS',
    setting_char_skin: 'Operative Skin:',
    skin_char_default: '👮 Classic Counter-Strike (SAS / T)',
    skin_char_steve: '⛏️ Steve (Minecraft Steve)',
    skin_char_creeper: '💥 Creeper (Minecraft Creeper)',
    skin_char_diamond: '💎 Diamond Steve (Armor)',
    setting_reticle: 'Crosshair Reticle [H]:',
    reticle_red_dot: '🔴 Red Dot (Reflex Sight)',
    reticle_holographic: '⭕ EOTech (Holographic Circle)',
    reticle_tactical_cross: '🟢 Tactical Cross',
    reticle_mil_dot: '🎯 Mil-Dot (Sniper Cross)',
    reticle_cs_classic: '➕ CS Classic (Dynamic)',
    setting_awp_skin: 'AWP Skin:',
    awp_dragon_lore: '🐉 AWP | Dragon Lore (Legendary)',
    awp_default: 'Classic Stock AWP',
    setting_ak_skin: 'AK-47 Skin:',
    ak_asiimov: '⚡ AK-47 | Asiimov (Sci-Fi)',
    ak_default: 'Classic Wood Furniture',
    setting_m4_skin: 'M4A1 Skin:',
    m4_howl: '🐺 M4A1 | Howl (Custom)',
    m4_default: 'Standard Military M4A1',
    setting_deagle_skin: 'Deagle Skin:',
    deagle_printstream: '✨ Deagle | Printstream (Pearl)',
    deagle_default: 'Classic Brushed Steel',
    setting_knife_skin: 'Knife Skin:',
    knife_doppler: '🔮 Karambit | Doppler Phase 2',
    knife_default: 'Standard Tactical Knife',
    setting_scout_skin: 'SSG 08 Skin:',
    scout_bloodsport: '🏎️ SSG 08 | Bloodsport',
    scout_default: 'Classic Scout',

    // Controls Guide
    controls_title: 'CONTROLS:',
    ctrl_movement: 'Move',
    ctrl_fire: 'Fire / Knife',
    ctrl_zoom: 'Zoom / ADS Scope',
    ctrl_reload: 'Reload',
    ctrl_jump: 'Jump / Respawn',
    ctrl_crouch: 'Crouch (accuracy ↑)',
    ctrl_weapons: 'Select Weapon (5 = C4)',
    ctrl_buy: 'Buy Menu',
    ctrl_score: 'Scoreboard',

    // Operative Card
    badge_team_ct: 'COUNTER-TERRORISTS (CT)',
    badge_team_t: 'TERRORISTS (T)',
    badge_status: 'STATUS: READY FOR COMBAT',
    badge_wpn_m4: 'LOADOUT: M4A1 CARBINE',
    badge_wpn_ak: 'LOADOUT: AK-47 ASSAULT RIFLE',

    // In-game HUD
    bomb_planted: '💣 BOMB PLANTED',
    shield_label: 'SHIELD:',
    prompt_defuse: 'HOLD [E] TO DEFUSE BOMB',
    prompt_plant: 'HOLD [E] TO PLANT BOMB',
    action_defusing: 'DEFUSING BOMB...',
    action_planting: 'PLANTING BOMB...',

    // Death & Respawn
    death_title: 'YOU DIED',
    death_killer: 'Eliminated by enemy',
    death_countdown_label: 'Automatic respawn in:',
    death_sec: 'sec',
    death_btn: 'Respawn Now [SPACE / E]',
    death_spectator: '«1 vs 5» Mode • Press [SPACE] or [E] for instant respawn',

    // Buy Menu
    buy_title: 'WEAPON STORE (BUY MENU)',
    buy_balance: 'Funds:',
    buy_pistols: '1. PISTOLS',
    buy_rifles: '2. RIFLES & SNIPERS',
    buy_equipment: '3. EQUIPMENT',
    buy_armor: '1. Kevlar + Helmet',
    buy_he: '2. High Explosive (HE)',
    buy_kit: '3. Defusal Kit',
    buy_ammo: '4. Full Ammo Resupply',
    buy_footer: 'Press [B] or [ESC] to exit buy menu',
    buy_no_money: 'Insufficient funds for this purchase!',

    // Scoreboard
    sb_title_beach: 'DE_BEACH - MATCH STATS',
    sb_title_dust2: 'DE_DUST2 - MATCH STATS',
    sb_subtitle: 'Counter-Strike 1.6 Dedicated Engine',
    sb_wins: 'WINS',
    sb_col_player: 'Player',
    sb_col_kills: 'Kills',
    sb_col_deaths: 'Deaths',
    sb_col_status: 'Status',
    sb_status_alive: 'Alive',
    sb_status_dead: 'Dead',

    // Announcements & Radio
    ct_win: 'COUNTER-TERRORISTS WIN',
    t_win: 'TERRORISTS WIN',
    bomb_defused_announcement: 'BOMB HAS BEEN DEFUSED',
    target_bombed_announcement: 'TARGET BOMBED & DESTROYED',
    reason_t_elim: 'All terrorists eliminated',
    reason_ct_elim: 'All counter-terrorists eliminated',
    radio_enemy_spotted: 'Enemy spotted!',
    radio_bomb_planted: 'Bomb has been planted!',
    radio_headshot: 'HEADSHOT!',
    radio_kill: 'Enemy down',

    // Language Toggle
    lang_btn_text: '🌐 LANG: ENG'
  }
};

class CSI18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('cs_game_lang') || 'ru';
    this.translations = CS_TRANSLATIONS;
  }

  t(key, fallback = '') {
    const dict = this.translations[this.currentLang] || this.translations.ru;
    return dict[key] !== undefined ? dict[key] : (fallback || key);
  }

  setLanguage(lang) {
    if (lang !== 'ru' && lang !== 'en') lang = 'ru';
    this.currentLang = lang;
    localStorage.setItem('cs_game_lang', lang);
    this.applyToDOM();

    // Notify listeners (Game, Audio, Lobby)
    window.dispatchEvent(new CustomEvent('cs_language_changed', { detail: { lang } }));
  }

  toggleLanguage() {
    this.setLanguage(this.currentLang === 'ru' ? 'en' : 'ru');
  }

  applyToDOM() {
    // 1. Text elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key);
      if (val) el.textContent = val;
    });

    // 2. HTML elements with data-i18n-html
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = this.t(key);
      if (val) el.innerHTML = val;
    });

    // 3. Option elements inside selects
    document.querySelectorAll('option[data-i18n]').forEach(opt => {
      const key = opt.getAttribute('data-i18n');
      const val = this.t(key);
      if (val) opt.textContent = val;
    });

    // 4. Update Language Toggle Button text
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
      langBtn.innerHTML = this.currentLang === 'ru' ? '🌐 <b>RU</b> / EN' : '🌐 RU / <b>EN</b>';
    }

    // 5. Update Active Operative Badge
    if (window.csGame && window.csGame.updateLobbyBadge) {
      window.csGame.updateLobbyBadge(window.csGame.playerTeam);
    }
  }

  init() {
    this.applyToDOM();
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        this.toggleLanguage();
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.5, 900);
        }
      });
    }
  }
}

// Global exposure
window.csI18n = new CSI18nManager();
window.CSI18n = window.csI18n;
