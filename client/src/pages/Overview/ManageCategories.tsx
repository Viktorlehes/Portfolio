import React, { useEffect, useState } from "react"
import './ManageCategories.css'
import SelectedCategories from "../../components/overview/Categories/SelectedCategories"
import CategoryManager from "../../components/overview/Categories/CategoryManager"
import { ArrowLeftFromLine } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { components } from "../../types/api-types";
import { api, useDataFetching, ENDPOINTS } from "../../utils/api";


type UserCategories = components["schemas"]["UserCategories"]
type DefaultCategory = components["schemas"]["DefaultCategory"];
type Token = components['schemas']['UnifiedToken'];

const Managecategories: React.FC = ({ }) => {
    const defaultCategoriesState = useDataFetching<DefaultCategory[]>(ENDPOINTS.DEFAULT_CATEGORIES);
    const userCategoriesState = useDataFetching<UserCategories>(ENDPOINTS.CATEGORIES);
    const defaultTokensState = useDataFetching<Token[]>(ENDPOINTS.DEFAULT_TOKENS);
    const navigate = useNavigate();

    const [showNull, setShowNull] = useState({
        defaultCategoriesState: defaultCategoriesState.isLoading,
        userCategoriesState: userCategoriesState.isLoading,
        defaultTokensState: defaultTokensState.isLoading
    })

    useEffect(() => {
        setShowNull(prev => ({
            ...prev,
            defaultCategoriesState: defaultCategoriesState.isLoading || !!defaultCategoriesState.error,
            userCategoriesState: userCategoriesState.isLoading || !!userCategoriesState.error,
            defaultTokensState: defaultTokensState.isLoading || !!defaultTokensState.error
        }));
      }, [defaultCategoriesState, userCategoriesState, defaultTokensState]);

    const handleAddCMCCategory = async (category_id: string) => {
        if (!showNull.userCategoriesState && userCategoriesState.data!.default_categories!.find(cat => cat.id === category_id)) {
            console.log('Category already added');
            return;
        }
        await api.post<boolean, object>('/overview/add-cmc-category', { category_id });
        await userCategoriesState.refetch();
    };
    
    const handleRemoveCMCCategory = async (category_id: string) => {
        await api.post<boolean, object>('/overview/remove-cmc-category', { category_id });
        await userCategoriesState.refetch();
    };

    const fetchSearchedTokens = async (name: string): Promise<Token[]> => {
        try {
            const response = await api.post<Token[], object>('/overview/find-tokens-by-name', { name });
            console.log('Search results:', response);
            
            if (response.success) {
                return response.data!;
            } else {
                return []
            }

        } catch (error) {
            console.error('Error searching tokens:', error);
            return [];
        }
    };

    const handleCreateCustomCategory = async (name: string, tokenIds: number[]) => {
        try {
            await api.post<boolean, object>('/overview/add-custom-category', {
                name,
                tokens: tokenIds
            });
            await userCategoriesState.refetch();
        } catch (error) {
            console.error('Error creating custom category:', error);
            throw error;
        }
    };

    const handleRemoveCustomCategory = async (category_id: string) => {
        try {
            await api.post<boolean, object>('/overview/remove-custom-category', { category_id });
            await userCategoriesState.refetch();
        } catch (error) {
            console.error('Error removing custom category:', error);
        }
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
                    userCategories={userCategoriesState}
                    nullStates={showNull} 
                    handleRemoveCategory={handleRemoveCMCCategory}
                    handleRemoveCustomCategory={handleRemoveCustomCategory}
                    />
                </section>
                <section className="managecategories-catagory-manager">
                    <CategoryManager 
                    defaultCategories={defaultCategoriesState} 
                    defaultTokens={defaultTokensState}
                    nullStates={showNull}
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