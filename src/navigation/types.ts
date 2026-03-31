export type RootStackParamList = {
  Bootstrap: undefined;
  Welcome: undefined;
  Login: { mode?: "login" | "register" } | undefined;
  Home: undefined;
  Collections: undefined;
  CollectionDetail: {
    id: string;
    browse?: boolean;
    collectionPreview?: {
      name?: string;
      imageUrl?: string;
      isPublic?: boolean;
    };
    itemsPreview?: Array<{
      id: number;
      name: string;
      category: string;
      price: number;
      description: string;
      imageUrl: string;
    }>;
  };
  ItemDetail: {
    id: string;
    browse?: boolean;
    collectionId?: string;
    openEdit?: boolean;
    itemPreview?: {
      id: number;
      name: string;
      category: string;
      price: number;
      description: string;
      imageUrl: string;
    };
  };
  Wishlist: undefined;
  Reports: undefined;
  Community: undefined;
  Auction: undefined;
  UserProfile: { userId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
