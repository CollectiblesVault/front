export const collections = [
  {
    id: 1,
    name: "Роскошные часы",
    itemCount: 24,
    totalValue: 125000,
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 2,
    name: "Редкие монеты",
    itemCount: 156,
    totalValue: 89500,
    image:
      "https://images.unsplash.com/photo-1762049213134-008e36819c1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYXJlJTIwY29pbiUyMGNvbGxlY3Rpb258ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 3,
    name: "Антикварные марки",
    itemCount: 342,
    totalValue: 45200,
    image:
      "https://images.unsplash.com/photo-1668349661067-4c64fddcd519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbnRpcXVlJTIwc3RhbXAlMjBwaGlsYXRlbHl8ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 4,
    name: "Изобразительное искусство",
    itemCount: 18,
    totalValue: 340000,
    image:
      "https://images.unsplash.com/photo-1654613001582-155f7c3a1f77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBzY3VscHR1cmUlMjBtdXNldW18ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 5,
    name: "Классические автомобили",
    itemCount: 7,
    totalValue: 1250000,
    image:
      "https://images.unsplash.com/photo-1524457006207-092fa5d972bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwY2FyJTIwdmludGFnZXxlbnwxfHx8fDE3NzQzNDQ1NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 6,
    name: "Виниловые пластинки",
    itemCount: 89,
    totalValue: 23400,
    image:
      "https://images.unsplash.com/photo-1631692364644-d6558eab0915?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHJlY29yZCUyMGNvbGxlY3Rpb258ZW58MXx8fHwxNzc0MzYwMTA5fDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
] as const;

export function collectionNameById(id: string | undefined) {
  const n = Number(id);
  const c = collections.find((x) => x.id === n);
  return c?.name ?? "Коллекция";
}

export const collectionItems = [
  {
    id: 1,
    name: "Ролекс Субмаринер 1680",
    category: "Часы",
    price: 45000,
    year: 1972,
    condition: "Отличное",
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: false,
  },
  {
    id: 2,
    name: "Омега Спидмастер Профессионал",
    category: "Часы",
    price: 6500,
    year: 1985,
    condition: "Очень хорошее",
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: true,
  },
  {
    id: 3,
    name: "Патек Филипп Калатрава",
    category: "Часы",
    price: 28000,
    year: 1995,
    condition: "Как новый",
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: false,
  },
  {
    id: 4,
    name: "Аудемар-Пиге Роял Оук",
    category: "Часы",
    price: 85000,
    year: 2010,
    condition: "Отличное",
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: true,
  },
] as const;

export const itemDetailById: Record<
  string,
  {
    id: number;
    name: string;
    category: string;
    price: number;
    year: number;
    condition: string;
    description: string;
    acquired: string;
    purchasePrice: number;
    currentValue: number;
    image: string;
    isWishlisted: boolean;
    likes: number;
    comments: { id: number; user: string; text: string; time: string }[];
  }
> = {
  "1": {
    id: 1,
    name: "Ролекс Субмаринер 1680",
    category: "Часы",
    price: 45000,
    year: 1972,
    condition: "Отличное",
    description:
      "Редкие винтажные часы Ролекс Субмаринер 1680 1972 года. На циферблате оригинальный «красный суб» — особенно ценится коллекционерами. Часы бережно обслуживались, в комплекте оригинальная коробка и документы.",
    acquired: "март 2022",
    purchasePrice: 38000,
    currentValue: 45000,
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: false,
    likes: 24,
    comments: [
      {
        id: 1,
        user: "Иван Д.",
        text: "Прекрасный экземпляр! Состояние на высоте.",
        time: "2 часа назад",
      },
      {
        id: 2,
        user: "Мария С.",
        text: "Красный суб — моя мечта. Поздравляю!",
        time: "5 часов назад",
      },
    ],
  },
  "5": {
    id: 5,
    name: "Патек Филипп Наутилус 5711",
    category: "Часы",
    price: 180000,
    year: 2018,
    condition: "Отличное",
    description:
      "Культовая спортивная модель в стальном корпусе. Высокий спрос на вторичном рынке.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 180000,
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: true,
    likes: 42,
    comments: [],
  },
  "6": {
    id: 6,
    name: "Цент Линкольна 1909-S VDB",
    category: "Монеты",
    price: 1500,
    year: 1909,
    condition: "VF",
    description: "Редкая разновидность с инициалами дизайнера на реверсе.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 1500,
    image:
      "https://images.unsplash.com/photo-1762049213134-008e36819c1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYXJlJTIwY29pbiUyMGNvbGxlY3Rpb258ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: true,
    likes: 8,
    comments: [],
  },
  "7": {
    id: 7,
    name: "Марка «Перевёрнутая Дженни»",
    category: "Марки",
    price: 1200000,
    year: 1918,
    condition: "Музейное",
    description: "Одна из самых известных филателистических редкостей.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 1200000,
    image:
      "https://images.unsplash.com/photo-1668349661067-4c64fddcd519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbnRpcXVlJTIwc3RhbXAlMjBwaGlsYXRlbHl8ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: true,
    likes: 156,
    comments: [],
  },
  "8": {
    id: 8,
    name: "Феррари 250 GTO",
    category: "Автомобили",
    price: 70000000,
    year: 1962,
    condition: "Оригинал",
    description: "Легендарный гоночный автомобиль с ограниченным тиражом.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 70000000,
    image:
      "https://images.unsplash.com/photo-1524457006207-092fa5d972bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwY2FyJTIwdmludGFnZXxlbnwxfHx8fDE3NzQzNDQ1NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: true,
    likes: 890,
    comments: [],
  },
  "9": {
    id: 9,
    name: "Этюд «Водяные лилии» (после Моне)",
    category: "Искусство",
    price: 450000,
    year: 1910,
    condition: "Хорошее",
    description:
      "Пейзаж с водяными лилиями в духе импрессионистов. Холст, масло. Провенанс и экспертиза — в полной версии приложения.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 450000,
    image:
      "https://images.unsplash.com/photo-1654613001582-155f7c3a1f77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBzY3VscHR1cmUlMjBtdXNldW18ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    isWishlisted: false,
    likes: 31,
    comments: [],
  },
  "101": {
    id: 101,
    name: "Картина «Городской пейзаж», 1920-е",
    category: "Искусство",
    price: 12400,
    year: 1925,
    condition: "Хорошее",
    description:
      "Городской пейзаж начала XX века. Продавец: коллекционер из сообщества. Предложение доступно до завершения таймера.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 12400,
    image:
      "https://images.unsplash.com/photo-1654613001582-155f7c3a1f77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    isWishlisted: false,
    likes: 3,
    comments: [{ id: 1, user: "Покупатель", text: "Интересный лот", time: "1 день назад" }],
  },
  "102": {
    id: 102,
    name: "Британский пенни 1933",
    category: "Монеты",
    price: 890,
    year: 1933,
    condition: "VF+",
    description: "Редкая для обращения разновидность. Чужой лот — лайк отличается от добавления в список желаний.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 890,
    image:
      "https://images.unsplash.com/photo-1762049213134-008e36819c1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    isWishlisted: false,
    likes: 12,
    comments: [],
  },
  "103": {
    id: 103,
    name: "Винтажный бинокль Zeiss",
    category: "Антиквариат",
    price: 2100,
    year: 1920,
    condition: "Рабочий",
    description: "Оптика Zeiss, кожаный футляр. Лот другого пользователя.",
    acquired: "—",
    purchasePrice: 0,
    currentValue: 2100,
    image:
      "https://images.unsplash.com/photo-1631692364644-d6558eab0915?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    isWishlisted: false,
    likes: 5,
    comments: [],
  },
};

export const wishlistSeed = [
  {
    id: 5,
    name: "Патек Филипп Наутилус 5711",
    category: "Часы",
    estimatedPrice: 180000,
    notes: "Ищу версию с синим циферблатом",
    image:
      "https://images.unsplash.com/photo-1763672087522-ab306ef0089d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwd2F0Y2glMjBsdXh1cnl8ZW58MXx8fHwxNzc0MzcxMzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    priority: "high" as const,
  },
  {
    id: 6,
    name: "Цент Линкольна 1909-S VDB",
    category: "Монеты",
    estimatedPrice: 1500,
    notes: "Состояние MS-65 и выше",
    image:
      "https://images.unsplash.com/photo-1762049213134-008e36819c1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYXJlJTIwY29pbiUyMGNvbGxlY3Rpb258ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    priority: "medium" as const,
  },
  {
    id: 7,
    name: "Марка «Перевёрнутая Дженни»",
    category: "Марки",
    estimatedPrice: 1200000,
    notes: "Грааль — жду подходящей возможности",
    image:
      "https://images.unsplash.com/photo-1668349661067-4c64fddcd519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbnRpcXVlJTIwc3RhbXAlMjBwaGlsYXRlbHl8ZW58MXx8fHwxNzc0MzcxMzYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    priority: "high" as const,
  },
  {
    id: 8,
    name: "Феррари 250 GTO",
    category: "Автомобили",
    estimatedPrice: 70000000,
    notes: "Мечта коллекционера",
    image:
      "https://images.unsplash.com/photo-1524457006207-092fa5d972bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwY2FyJTIwdmludGFnZXxlbnwxfHx8fDE3NzQzNDQ1NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    priority: "low" as const,
  },
];

export const portfolioData = [
  { month: "Янв", value: 320000 },
  { month: "Фев", value: 335000 },
  { month: "Мар", value: 342000 },
  { month: "Апр", value: 358000 },
  { month: "Май", value: 375000 },
  { month: "Июн", value: 389000 },
];

export const categoryData = [
  { name: "Классические авто", value: 1250000, color: "#D4AF37" },
  { name: "Искусство", value: 340000, color: "#B8941E" },
  { name: "Роскошные часы", value: 125000, color: "#9C7A0F" },
  { name: "Редкие монеты", value: 89500, color: "#C9A429" },
  { name: "Антикварные марки", value: 45200, color: "#E0BE3D" },
];

export const topPerformers = [
  { name: "Ролекс Субмаринер 1680", appreciation: 18.4, value: 45000 },
  { name: "Феррари 250 GT", appreciation: 15.2, value: 380000 },
  { name: "Цент Линкольна 1909-S VDB", appreciation: 12.8, value: 2800 },
];

// Аукционы полностью отключены (убраны из навигации и экранов).

export const homeStats = [
  { label: "Всего предметов", value: "636" },
  { label: "Коллекций", value: "6" },
  { label: "Общая стоимость", value: "1,85 млн долл." },
  { label: "Список желаний", value: "4" },
] as const;

export type RecentActivityTarget =
  | { name: "ItemDetail"; params: { id: string } }
  | { name: "Reports" };

export const recentActivity: {
  type: string;
  item: string;
  time: string;
  target: RecentActivityTarget;
}[] = [
  {
    type: "Добавлен предмет",
    item: "Ролекс Субмаринер",
    time: "неделю назад",
    target: { name: "ItemDetail", params: { id: "1" } },
  },
  {
    type: "Достижение",
    item: "Уровень коллекционера 5",
    time: "2 недели назад",
    target: { name: "Reports" },
  },
];

/** Комментарии к коллекции (демо). */
export const collectionComments = [
  { id: 1, user: "Алексей К.", text: "Отличная подборка, завидую!", time: "3 дня назад" },
  { id: 2, user: "Елена В.", text: "Есть ли дубликаты на обмен?", time: "неделю назад" },
  { id: 3, user: "Дмитрий П.", text: "Очень достойные экземпляры.", time: "2 недели назад" },
] as const;

/** Текущий пользователь в ленте сообщества (можно скрыть из поиска). */
export const CURRENT_COMMUNITY_USER_ID = "user-me";

export interface CommunityUser {
  id: string;
  displayName: string;
  handle: string;
  collectionsCount: number;
  itemsCount: number;
  totalValueUsd: number;
  avatar: string;
  bio: string;
  isSelf: boolean;
}

export const communityUsers: CommunityUser[] = [
  {
    id: CURRENT_COMMUNITY_USER_ID,
    displayName: "Александр (вы)",
    handle: "@my_vault",
    collectionsCount: 6,
    itemsCount: 636,
    totalValueUsd: 1_850_000,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    bio: "Коллекционер часов и редких монет. Обмен и консультации.",
    isSelf: true,
  },
  {
    id: "u-nina",
    displayName: "Нина Волкова",
    handle: "@nina_stamps",
    collectionsCount: 12,
    itemsCount: 2100,
    totalValueUsd: 420_000,
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    bio: "Марки и конверты XIX века.",
    isSelf: false,
  },
  {
    id: "u-igor",
    displayName: "Игорь М.",
    handle: "@classic_auto_ru",
    collectionsCount: 3,
    itemsCount: 14,
    totalValueUsd: 4_200_000,
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    bio: "Классические автомобили и литература.",
    isSelf: false,
  },
  {
    id: "u-sophie",
    displayName: "Sophie Laurent",
    handle: "@art_sophie",
    collectionsCount: 8,
    itemsCount: 44,
    totalValueUsd: 2_100_000,
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    bio: "Живопись и скульптура модерна.",
    isSelf: false,
  },
];
