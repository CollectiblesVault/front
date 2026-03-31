declare module "@react-navigation/native" {
  export function useNavigation<T = any>(): T;
}

declare module "@react-navigation/native-stack" {
  export type NativeStackNavigationProp<
    ParamList extends Record<string, object | undefined> = any,
    RouteName extends keyof ParamList = any
  > = any;
}

