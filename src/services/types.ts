export type ListParams = {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
  from?: string;
  to?: string;
  [key: string]: string | number | undefined;
};
