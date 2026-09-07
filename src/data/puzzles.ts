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
const asset = (id: string) => `${import.meta.env.BASE_URL}assets/puzzles/${id}.svg`;
function category(
  id: string,
  title: string,
  subtitle: string,
  color: string,
  entries: [string, string][],
): PuzzleCategory {
  return {
    id,
    title,
    subtitle,
    color,
    coverImage: asset(entries[0]![0]),
    puzzles: entries.map(([puzzleId, puzzleTitle]) => ({
      id: puzzleId,
      title: puzzleTitle,
      categoryId: id,
      imageUrl: asset(puzzleId),
    })),
  };
}
export const categories: PuzzleCategory[] = [
  category('stories', 'Сказки', 'В гости к волшебству', 'lavender', [
    ['castle', 'Волшебный замок'],
    ['dragon', 'Добрый дракон'],
    ['fox', 'Лесная сказка'],
  ]),
  category('animals', 'Животные', 'Знакомимся с друзьями', 'peach', [
    ['lion', 'Львёнок'],
    ['elephant', 'Слонёнок'],
    ['giraffe', 'Жираф'],
    ['cat', 'Кот'],
    ['dog', 'Собака'],
    ['panda', 'Панда'],
  ]),
  category('cars', 'Машины', 'Навстречу приключениям', 'mint', [
    ['car', 'Синяя машинка'],
    ['truck', 'Грузовик'],
    ['tractor', 'Трактор'],
    ['firetruck', 'Пожарная машина'],
    ['bus', 'Автобус'],
  ]),
];
export const builtInPuzzles = categories.flatMap((item) => item.puzzles);
