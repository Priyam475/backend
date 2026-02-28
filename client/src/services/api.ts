// Public API entrypoint for all client services.
// Re-export concrete module APIs so consumers can import from '@/services/api'.
export { authApi } from './api/auth';
export { commodityApi } from './api/commodities';
export { contactApi } from './api/contacts';
export { arrivalsApi } from './api/arrivals';
export { traderApi } from './api/trader';
export { vehicleApi } from './api/vehicles';
export { categoryApi } from './api/categories';
export { rbacApi } from './api/mock';
export { auctionApi, fetchAllAuctionResults } from './api/auction';
export { weighingApi } from './api/weighing';
export { printLogApi } from './api/printLog';
export { selfSaleApi } from './api/selfSale';
export type {
  LotSummaryDTO,
  AuctionSessionDTO,
  AuctionEntryDTO,
  AuctionResultDTO,
  AuctionResultEntryDTO,
  AuctionBidCreateRequest,
  AuctionBidUpdateRequest,
  ListLotsParams,
  ListResultsParams,
  PresetType,
} from './api/auction';
export type { WeighingSessionDTO, WeighingSessionCreateRequest } from './api/weighing';
export type { PrintLogDTO, PrintLogCreateRequest } from './api/printLog';
export type { OpenLotDTO, ClosureDTO, CreateClosureRequest } from './api/selfSale';
