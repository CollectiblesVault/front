export type RootStackParamList = {
  Bootstrap: undefined;
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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
