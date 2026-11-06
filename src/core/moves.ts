import { Move } from '../types';

export const ALL_MOVES: Move[] = [
  // ノーマル
  { id: 'tackle', name: 'たいあたり', type: 'normal', category: 'physical', power: 50, accuracy: 100 },
  { id: 'body_slam', name: 'のしかかり', type: 'normal', category: 'physical', power: 85, accuracy: 100 },
  { id: 'double_edge', name: 'すてみタックル', type: 'normal', category: 'physical', power: 120, accuracy: 100 },
  { id: 'tri_attack', name: 'トライアタック', type: 'normal', category: 'special', power: 80, accuracy: 100 },
  { id: 'hyper_beam', name: 'はかいこうせん', type: 'normal', category: 'special', power: 150, accuracy: 90 },

  // ほのお
  { id: 'fire_punch', name: 'ほのおのパンチ', type: 'fire', category: 'physical', power: 75, accuracy: 100 },
  { id: 'flare_blitz', name: 'フレアドライブ', type: 'fire', category: 'physical', power: 120, accuracy: 100 },
  { id: 'flamethrower', name: 'かえんほうしゃ', type: 'fire', category: 'special', power: 90, accuracy: 100 },
  { id: 'fire_blast', name: 'だいもんじ', type: 'fire', category: 'special', power: 110, accuracy: 85 },

  // みず
  { id: 'aqua_tail', name: 'アクアテール', type: 'water', category: 'physical', power: 90, accuracy: 90 },
  { id: 'waterfall', name: 'たきのぼり', type: 'water', category: 'physical', power: 80, accuracy: 100 },
  { id: 'surf', name: 'なみのり', type: 'water', category: 'special', power: 90, accuracy: 100 },
  { id: 'hydro_pump', name: 'ハイドロポンプ', type: 'water', category: 'special', power: 110, accuracy: 80 },

  // でんき
  { id: 'thunder_punch', name: 'かみなりパンチ', type: 'electric', category: 'physical', power: 75, accuracy: 100 },
  { id: 'wild_charge', name: 'ワイルドボルト', type: 'electric', category: 'physical', power: 90, accuracy: 100 },
  { id: 'thunderbolt', name: '10まんボルト', type: 'electric', category: 'special', power: 90, accuracy: 100 },
  { id: 'thunder', name: 'かみなり', type: 'electric', category: 'special', power: 110, accuracy: 70 },

  // くさ
  { id: 'leaf_blade', name: 'リーフブレード', type: 'grass', category: 'physical', power: 90, accuracy: 100 },
  { id: 'wood_hammer', name: 'ウッドハンマー', type: 'grass', category: 'physical', power: 120, accuracy: 100 },
  { id: 'energy_ball', name: 'エナジーボール', type: 'grass', category: 'special', power: 90, accuracy: 100 },
  { id: 'leaf_storm', name: 'リーフストーム', type: 'grass', category: 'special', power: 130, accuracy: 90 },

  // こおり
  { id: 'ice_punch', name: 'れいとうパンチ', type: 'ice', category: 'physical', power: 75, accuracy: 100 },
  { id: 'icicle_crash', name: 'つららおとし', type: 'ice', category: 'physical', power: 85, accuracy: 90 },
  { id: 'ice_beam', name: 'れいとうビーム', type: 'ice', category: 'special', power: 90, accuracy: 100 },
  { id: 'blizzard', name: 'ふぶき', type: 'ice', category: 'special', power: 110, accuracy: 70 },

  // かくとう
  { id: 'brick_break', name: 'かわらわり', type: 'fighting', category: 'physical', power: 75, accuracy: 100 },
  { id: 'close_combat', name: 'インファイト', type: 'fighting', category: 'physical', power: 120, accuracy: 100 },
  { id: 'aura_sphere', name: 'はどうだん', type: 'fighting', category: 'special', power: 80, accuracy: 100 },
  { id: 'focus_blast', name: 'きあいだま', type: 'fighting', category: 'special', power: 120, accuracy: 70 },

  // どく
  { id: 'poison_jab', name: 'どくづき', type: 'poison', category: 'physical', power: 80, accuracy: 100 },
  { id: 'gunk_shot', name: 'ダストシュート', type: 'poison', category: 'physical', power: 120, accuracy: 80 },
  { id: 'sludge_bomb', name: 'ヘドロばくだん', type: 'poison', category: 'special', power: 90, accuracy: 100 },
  { id: 'sludge_wave', name: 'ヘドロウェーブ', type: 'poison', category: 'special', power: 95, accuracy: 100 },

  // じめん
  { id: 'earthquake', name: 'じしん', type: 'ground', category: 'physical', power: 100, accuracy: 100 },
  { id: 'bulldoze', name: 'じならし', type: 'ground', category: 'physical', power: 60, accuracy: 100 },
  { id: 'earth_power', name: 'だいちのちから', type: 'ground', category: 'special', power: 90, accuracy: 100 },

  // ひこう
  { id: 'brave_bird', name: 'ブレイブバード', type: 'flying', category: 'physical', power: 120, accuracy: 100 },
  { id: 'aerial_ace', name: 'つばめがえし', type: 'flying', category: 'physical', power: 60, accuracy: 100 },
  { id: 'air_slash', name: 'エアスラッシュ', type: 'flying', category: 'special', power: 75, accuracy: 95 },
  { id: 'hurricane', name: 'ぼうふう', type: 'flying', category: 'special', power: 110, accuracy: 70 },

  // エスパー
  { id: 'zen_headbutt', name: 'しねんのずつき', type: 'psychic', category: 'physical', power: 80, accuracy: 90 },
  { id: 'psychic', name: 'サイコキネシス', type: 'psychic', category: 'special', power: 90, accuracy: 100 },
  { id: 'psyshock', name: 'サイコショック', type: 'psychic', category: 'special', power: 80, accuracy: 100 },

  // むし
  { id: 'x_scissor', name: 'シザークロス', type: 'bug', category: 'physical', power: 80, accuracy: 100 },
  { id: 'megahorn', name: 'メガホーン', type: 'bug', category: 'physical', power: 120, accuracy: 85 },
  { id: 'bug_buzz', name: 'むしのさざめき', type: 'bug', category: 'special', power: 90, accuracy: 100 },

  // いわ
  { id: 'rock_slide', name: 'いわなだれ', type: 'rock', category: 'physical', power: 75, accuracy: 90 },
  { id: 'stone_edge', name: 'ストーンエッジ', type: 'rock', category: 'physical', power: 100, accuracy: 80 },
  { id: 'power_gem', name: 'パワージェム', type: 'rock', category: 'special', power: 80, accuracy: 100 },

  // ゴースト
  { id: 'shadow_claw', name: 'シャドークロー', type: 'ghost', category: 'physical', power: 70, accuracy: 100 },
  { id: 'poltergeist', name: 'ポルターガイスト', type: 'ghost', category: 'physical', power: 110, accuracy: 90 },
  { id: 'shadow_ball', name: 'シャドーボール', type: 'ghost', category: 'special', power: 80, accuracy: 100 },

  // ドラゴン
  { id: 'dragon_claw', name: 'ドラゴンクロー', type: 'dragon', category: 'physical', power: 80, accuracy: 100 },
  { id: 'outrage', name: 'げきりん', type: 'dragon', category: 'physical', power: 120, accuracy: 100 },
  { id: 'dragon_pulse', name: 'りゅうのはどう', type: 'dragon', category: 'special', power: 85, accuracy: 100 },
  { id: 'draco_meteor', name: 'りゅうせいぐん', type: 'dragon', category: 'special', power: 130, accuracy: 90 },

  // あく
  { id: 'crunch', name: 'かみくだく', type: 'dark', category: 'physical', power: 80, accuracy: 100 },
  { id: 'knock_off', name: 'はたきおとす', type: 'dark', category: 'physical', power: 65, accuracy: 100 },
  { id: 'dark_pulse', name: 'あくのはどう', type: 'dark', category: 'special', power: 80, accuracy: 100 },

  // はがね
  { id: 'iron_head', name: 'アイアンヘッド', type: 'steel', category: 'physical', power: 80, accuracy: 100 },
  { id: 'heavy_slam', name: 'ヘビーボンバー', type: 'steel', category: 'physical', power: 100, accuracy: 100 },
  { id: 'flash_cannon', name: 'ラスターカノン', type: 'steel', category: 'special', power: 80, accuracy: 100 },

  // フェアリー
  { id: 'play_rough', name: 'じゃれつく', type: 'fairy', category: 'physical', power: 90, accuracy: 90 },
  { id: 'moonblast', name: 'ムーンフォース', type: 'fairy', category: 'special', power: 95, accuracy: 100 },
  { id: 'dazzling_gleam', name: 'マジカルシャイン', type: 'fairy', category: 'special', power: 80, accuracy: 100 },
];
