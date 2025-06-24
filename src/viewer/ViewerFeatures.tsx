//TODO - expand feature customizability and write docs
export interface ViewerFeatures {
  hover?: {
    enabled?: boolean;
    color?: number;
    thickness?: number;
  };
  selection?: {
    enabled?: boolean;
    multiple?: boolean;
    remove?: boolean;
    color?: number;
    thickness?: number;
  };
  snapping?: {
    enabled?: boolean;
    tolerance?: number;
  };
}
