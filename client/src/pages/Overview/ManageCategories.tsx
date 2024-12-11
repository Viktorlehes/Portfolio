import React, { useEffect, useState } from "react"
import './ManageCategories.css'
import SelectedCategories from "../../components/overview/Categories/SelectedCategories"
import CategoryManager from "../../components/overview/Categories/CategoryManager"
import { ArrowLeftFromLine } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { LoaderFunction, useLoaderData } from "react-router-dom";
import { components } from "../../types/api-types";
import { getCachedData } from "../../utils/api";
import { useActiveFetches, isEndpointFetching } from "../../context/ActiveFetchesContext";
import { api } from "../../utils/api";

type Category = components["schemas"]["CategoryData"];
type CustomCategory = components["schemas"]["CustomCategory"];
type Token = components['schemas']['FullCMCToken'];

interface LoaderData {
    defaultCategories: CachedData<Category[]>;
    userCategories: CachedData<Category[]>;
    customCategories: CachedData<CustomCategory[]>;
    defaultTokens: CachedData<Token[]>;
}

interface CachedData<T> {
    data: T;
    timestamp: number;
}

const CACHE_KEYS = {
    DEFAULT_CATEGORIES: 'defaultCategories',
    USER_CATEGORIES: 'userCategories',
    CUSTOM_CATEGORIES: 'customCategories',
    DEFAULTTOKENS: 'defaultTokens'
} as const;

const API_ENDPOINTS = {
    DEFAULT_CATEGORIES: '/overview/get-default-categories',
    USER_CATEGORIES: '/overview/get-user-catagories',
    CUSTOM_CATEGORIES: '/overview/get-custom-categories',
    DEFAULTTOKENS: '/overview/get-default-tokens'
} as const;

interface nullStates {
    defaultCategories: boolean;
    userCategories: boolean;
    customCategories: boolean;
    defaultTokens: boolean;
}

export const manageLoader: LoaderFunction = async () => {
    const defaultCategories = getCachedData(CACHE_KEYS.DEFAULT_CATEGORIES) as CachedData<Category[]>;
    const userCategories = getCachedData(CACHE_KEYS.USER_CATEGORIES) as CachedData<Category[]>;
    const customCategories = getCachedData(CACHE_KEYS.CUSTOM_CATEGORIES) as CachedData<CustomCategory[]>;
    const defaultTokens = getCachedData(CACHE_KEYS.DEFAULTTOKENS) as CachedData<Token[]>;

    return {
        defaultCategories: {
            data: defaultCategories?.data || null,
            timestamp: defaultCategories?.timestamp || null
        } as CachedData<Category[]>,
        userCategories: {
            data: userCategories?.data || null,
            timestamp: userCategories?.timestamp || null
        } as CachedData<Category[]>,
        customCategories: {
            data: customCategories?.data || null,
            timestamp: customCategories?.timestamp || null
        } as CachedData<CustomCategory[]>,
        defaultTokens: {
            data: defaultTokens?.data || null,
            timestamp: defaultTokens?.timestamp || null
        } as CachedData<Token[]>
    } as LoaderData;
}

const Managecategories: React.FC = ({ }) => {
    const cachedData = useLoaderData() as LoaderData;
    const [manageData, setManageData] = useState<LoaderData>(cachedData);
    const [nullStates, setNullStates] = useState<nullStates>({
        defaultCategories: !cachedData.defaultCategories.data,
        userCategories: !cachedData.userCategories.data,
        customCategories: !cachedData.customCategories.data,
        defaultTokens: !cachedData.defaultTokens.data
    });
    const activeFetches = useActiveFetches();
    const navigate = useNavigate();

    useEffect(() => {
        if (nullStates.defaultCategories) {
            if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.DEFAULT_CATEGORIES)) {
                activeFetches.current.add(API_ENDPOINTS.DEFAULT_CATEGORIES);
                api.get(API_ENDPOINTS.DEFAULT_CATEGORIES)
                    .then(categories => {
                        const newData = {
                            data: categories,
                            timestamp: Date.now()
                        };
                        setManageData(prev => ({ ...prev, defaultCategories: newData }));
                        localStorage.setItem(CACHE_KEYS.DEFAULT_CATEGORIES, JSON.stringify(newData));
                        setNullStates(prev => ({ ...prev, wallets: false }));
                    })
                    .catch(error => {
                        console.error('Error fetching wallets:', error);
                        activeFetches.current.delete(API_ENDPOINTS.DEFAULT_CATEGORIES);
                    })
                    .finally(() => {
                        activeFetches.current.delete(API_ENDPOINTS.DEFAULT_CATEGORIES);
                    });
            }
        }

        if (nullStates.userCategories) {
            if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.USER_CATEGORIES)) {
                activeFetches.current.add(API_ENDPOINTS.USER_CATEGORIES);
                api.get(API_ENDPOINTS.USER_CATEGORIES)
                    .then(categories => {
                        const newData = {
                            data: categories,
                            timestamp: Date.now()
                        };
                        setManageData(prev => ({ ...prev, userCategories: newData }));
                        localStorage.setItem(CACHE_KEYS.USER_CATEGORIES, JSON.stringify(newData));
                        setNullStates(prev => ({ ...prev, userCategories: false }));
                    })
                    .catch(error => {
                        console.error('Error fetching wallets:', error);
                        activeFetches.current.delete(API_ENDPOINTS.USER_CATEGORIES);
                    })
                    .finally(() => {
                        activeFetches.current.delete(API_ENDPOINTS.USER_CATEGORIES);
                    });
            }
        }

        if (nullStates.customCategories) {
            if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.CUSTOM_CATEGORIES)) {
                activeFetches.current.add(API_ENDPOINTS.CUSTOM_CATEGORIES);
                api.get(API_ENDPOINTS.CUSTOM_CATEGORIES)
                    .then(categories => {
                        const newData = {
                            data: categories,
                            timestamp: Date.now()
                        };
                        setManageData(prev => ({ ...prev, customCategories: newData }));
                        localStorage.setItem(CACHE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(newData));
                        setNullStates(prev => ({ ...prev, customCategories: false }));
                    })
                    .catch(error => {
                        console.error('Error fetching wallets:', error);
                        activeFetches.current.delete(API_ENDPOINTS.CUSTOM_CATEGORIES);
                    })
                    .finally(() => {
                        activeFetches.current.delete(API_ENDPOINTS.CUSTOM_CATEGORIES);
                    });
            }
        }

        if (nullStates.defaultTokens) {
            if (!isEndpointFetching(activeFetches.current, API_ENDPOINTS.DEFAULTTOKENS)) {
                activeFetches.current.add(API_ENDPOINTS.DEFAULTTOKENS);
                api.get(API_ENDPOINTS.DEFAULTTOKENS)
                    .then(tokens => {
                        const newData = {
                            data: tokens,
                            timestamp: Date.now()
                        };
                        setManageData(prev => ({ ...prev, defaultTokens: newData }));
                        localStorage.setItem(CACHE_KEYS.DEFAULTTOKENS, JSON.stringify(newData));
                        setNullStates(prev => ({ ...prev, defaultTokens: false }));
                    })
                    .catch(error => {
                        console.error('Error fetching wallets:', error);
                        activeFetches.current.delete(API_ENDPOINTS.DEFAULTTOKENS);
                    })
                    .finally(() => {
                        activeFetches.current.delete(API_ENDPOINTS.DEFAULTTOKENS);
                    });
            }
        }
    }, []);

    const handleAddCMCCategory = (category: Category) => {
        // Check if category already exists
        if (manageData.userCategories.data.find(cat => cat.id === category.id)) {
            console.log('Category already added');
            return;
        }
    
        const categoryId = category.id;
        api.post('/overview/add-CMC-category', { categoryId })
            .then(newCategory => {
                
                setManageData(prev => ({
                    ...prev,
                    userCategories: {
                        data: [...prev.userCategories.data, newCategory],
                        timestamp: Date.now()
                    }
                }));
    
                // Update localStorage
                const updatedData = {
                    data: [...manageData.userCategories.data, newCategory],
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEYS.USER_CATEGORIES, JSON.stringify(updatedData));
            })
            .catch(error => {
                console.error('Error adding CMC category:', error);
            });
    };
    
    const handleRemoveCMCCategory = (categoryId: string) => {
        api.post('/overview/remove-CMC-category', { categoryId })
            .then(() => {
                setManageData(prev => ({
                    ...prev,
                    userCategories: {
                        data: prev.userCategories.data.filter(cat => cat.id !== categoryId),
                        timestamp: Date.now()
                    }
                }));
    
                // Update localStorage
                const updatedData = {
                    data: manageData.userCategories.data.filter(cat => cat.id !== categoryId),
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEYS.USER_CATEGORIES, JSON.stringify(updatedData));
            })
            .catch(error => {
                console.error('Error removing CMC category:', error);
                // Consider adding error notification here
            });
    };

    const fetchSearchedTokens = async (name: string): Promise<Token[]> => {
        try {
            const response = await api.post('/overview/find-tokens-by-name', { name });
            console.log('Search results:', response);
            
            return response;
        } catch (error) {
            console.error('Error searching tokens:', error);
            return [];
        }
    };

    const handleCreateCustomCategory = async (name: string, tokenIds: number[]) => {
        try {
            const response = await api.post('/overview/add-custom-category', {
                name,
                token_ids: tokenIds
            });

            console.log('Custom category created:', response);
            
            // Update local state with new category
            setManageData(prev => ({
                ...prev,
                customCategories: {
                    data: [...prev.customCategories.data, response],
                    timestamp: Date.now()
                }
            }));
    
            // Update localStorage
            const updatedData = {
                data: [...manageData.customCategories.data, response],
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(updatedData));
    
        } catch (error) {
            console.error('Error creating custom category:', error);
            throw error; // Re-throw to handle in the component
        }
    };

    const handleRemoveCustomCategory = (categoryId: string) => {
        api.post('/overview/remove-custom-category', { categoryId })
            .then(() => {
                setManageData(prev => ({
                    ...prev,
                    customCategories: {
                        data: prev.customCategories.data.filter(cat => cat.id !== categoryId),
                        timestamp: Date.now()
                    }
                }));
    
                // Update localStorage
                const updatedData = {
                    data: manageData.customCategories.data.filter(cat => cat.id !== categoryId),
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(updatedData));
            })
            .catch(error => {
                console.error('Error removing custom category:', error);
                // Consider adding error notification here
            });
    };

return (
    <div className="default-page">
        <div className="page-header">
            <div className="managecategories-main-header-content">
                <h1>Manage Categories</h1>
            </div>
        </div>
        <div className="page-content">
            <div className="manage-categories-content">
                <button onClick={() => navigate('/')}
                    className="managecategories-back-button">
                    <ArrowLeftFromLine />
                </button>
                <section className="managecategories-selected-categories">
                    <SelectedCategories 
                    userCategories={manageData.userCategories.data}
                    customCategories={manageData.customCategories.data}
                    nullStates={{
                        userCategories: nullStates.userCategories,
                        customCategories: nullStates.customCategories
                    }} 
                    handleRemoveCategory={handleRemoveCMCCategory}
                    handleRemoveCustomCategory={handleRemoveCustomCategory}
                    />
                </section>
                <section className="managecategories-catagory-manager">
                    <CategoryManager 
                    defaultCategories={manageData.defaultCategories.data} 
                    defaultTokens={manageData.defaultTokens.data}
                    nullStates={{
                        defaultCategories: nullStates.defaultCategories,
                        defaultTokens: nullStates.defaultTokens
                    }}
                    handleAddCMCCategory={handleAddCMCCategory}
                    fetchSearchedTokens={fetchSearchedTokens}
                    handleCreateCustomCategory={handleCreateCustomCategory}
                    />
                </section>
            </div>
        </div>
    </div>
);
}

export default Managecategories;