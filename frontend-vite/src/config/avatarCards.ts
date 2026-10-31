export type AvatarRarity = 'Common' | 'Rare' | 'Legendary';

export interface AvatarCardDesign {
  number?: string;
  name?: string;
  description?: string;
  image?: string;
  imageFit?: 'contain' | 'cover';
  rarity?: AvatarRarity;
  edition?: string;
}

// Edit designs here using the avatar ID from the database.
// Example: image: '/avatars/lion.png', name: 'Nama karaktermu'.
// Rarity is decorative; prices and ownership always come from the server.
export const avatarCardDesigns: Record<string, AvatarCardDesign> = {
  lion: { number: '001', rarity: 'Common' },
  panda: { number: '002', rarity: 'Common' },
  fox: { number: '003', rarity: 'Common' },
  frog: { number: '004', rarity: 'Common' },
  unicorn: { number: '005', rarity: 'Common' },
  koala: { number: '006', rarity: 'Common' },
  butterfly: { number: '007', rarity: 'Common' },
  turtle: { number: '008', rarity: 'Common' },
  runner: { number: '009', rarity: 'Rare' },
  astronaut: { number: '010', rarity: 'Rare' },
  dragon: { number: '011', rarity: 'Legendary' },
};
