import { components } from "../../types/api-types";
import { LoaderFunction, LoaderFunctionArgs } from "react-router-dom";
import { getCachedData } from "../../utils/api";
type Wallet = components['schemas']['Wallet'];

interface CachedData<T> {
    data: T;
    timestamp: number;
}

const CACHE_KEYS = {
    WALLETS: 'wallets',
    CHARTS: 'charts',
} as const;

interface AssetLoaderData {
    assetId: string;
    assetName: string;
    isFungible: boolean;
    wallets: CachedData<Wallet[] | null>;
}

export const assetLoader: LoaderFunction = async ({
    params,
    request
}: LoaderFunctionArgs): Promise<AssetLoaderData> => {
    const url = new URL(request.url);
    const assetName = url.searchParams.get('name') || '';
    const isFungible = url.searchParams.get('fungible') === 'true';

    if (!params.assetId) {
        throw new Error('Asset ID is required');
    }

    const cachedWallets = getCachedData(CACHE_KEYS.WALLETS);

    return {
        assetId: params.assetId,
        assetName,
        isFungible,
        wallets: {
            data: cachedWallets ? cachedWallets.data : null,
            timestamp: cachedWallets ? cachedWallets.timestamp : 0
        }
    };
};