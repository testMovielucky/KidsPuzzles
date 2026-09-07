export interface Puzzle {
  id: string;
  title: string;
  imageUrl: string;
  categoryId: string;
}
export interface PuzzleCategory {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  color: string;
  puzzles: Puzzle[];
}
const asset = (filename: string) => `${import.meta.env.BASE_URL}assets/puzzles/${filename}`;
function category(
  id: string,
  title: string,
  subtitle: string,
  color: string,
  entries: [id: string, title: string, filename: string][],
): PuzzleCategory {
  const puzzles = entries.map(([puzzleId, puzzleTitle, filename]) => ({
    id: puzzleId,
    title: puzzleTitle,
    categoryId: id,
    imageUrl: asset(filename),
  }));
  return {
    id,
    title,
    subtitle,
    color,
    coverImage: puzzles[0]?.imageUrl ?? '',
    puzzles,
  };
}
export const categories: PuzzleCategory[] = [
  // These themes will appear once their finished illustrations are added.
  category('stories', 'Сказки', 'В гости к волшебству', 'lavender', []),
  category('animals', 'Животные', 'Знакомимся с друзьями', 'peach', []),
  category('cars', 'Машины', 'Навстречу приключениям', 'mint', [
    ['dump_truck', 'Самосвал', 'dump_truck.png'],
    ['firetruck', 'Пожарная машина', 'firetruck.png'],
    ['concrete_mixer', 'Бетономешалка', 'concrete_mixer.png'],
    ['ambulance', 'Скорая помощь', 'ambulance.png'],
    ['monster_truck', 'Монстр трак', 'monster_truck.png'],
    ['polo', 'Наша машина', 'polo.png'],
    ['formula', 'Гоночная машина', 'formula.png'],
    ['police', 'Полицейская машина', 'police.png'],
  ]),
].filter((item) => item.puzzles.length > 0);
export const builtInPuzzles = categories.flatMap((item) => item.puzzles);
