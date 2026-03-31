export type RootStackParamList = {
  Welcome: undefined;
  Login: { mode?: "login" | "register" } | undefined;
  Home: undefined;
  Collections: undefined;
  CollectionDetail: { id: string; browse?: boolean };
  ItemDetail: { id: string; browse?: boolean; collectionId?: string; openEdit?: boolean };
  Wishlist: undefined;
  Reports: undefined;
  Community: undefined;
  Auction: undefined;
  UserProfile: { userId: string };
  OfflineDemo: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
