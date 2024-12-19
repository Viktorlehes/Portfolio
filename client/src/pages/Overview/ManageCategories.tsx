import React from "react"
import './ManageCategories.css'
import SelectedCategories from "../../components/overview/Categories/SelectedCategories"
import CategoryManager from "../../components/overview/Categories/CategoryManager"
import { ArrowLeftFromLine } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { components } from "../../types/api-types";
import { api, FetchState, useDataFetching, ENDPOINTS } from "../../utils/api";

type Category = components["schemas"]["CategoryData"];
type CustomCategory = components["schemas"]["CustomCategory"];
type Token = components['schemas']['FullCMCToken'];

type CategoryResponse = FetchState<Category[]>;
type CustomCategoryResponse = FetchState<CustomCategory[]>;
type TokenResponse = FetchState<Token[]>;

const Managecategories: React.FC = ({ }) => {
    const defaultCategoriesState = useDataFetching<CategoryResponse>(ENDPOINTS.DEFAULT_CATEGORIES);
    const userCategoriesState = useDataFetching<CategoryResponse>(ENDPOINTS.CATEGORIES);
    const customCategoriesState = useDataFetching<CustomCategoryResponse>(ENDPOINTS.CUSTOM_CATEGORIES);
    const defaultTokensState = useDataFetching<TokenResponse>(ENDPOINTS.DEFAULT_TOKENS);
    const navigate = useNavigate();

    const handleAddCMCCategory = async (category: Category) => {
        // Check if category already exists
        if (userCategoriesState.data?.data?.find(cat => cat.id === category.id)) {
            console.log('Category already added');
            return;
        }
        const categoryId = category.id;
        await api.post('/overview/add-CMC-category', { categoryId });
        await userCategoriesState.refetch();
    };
    
    const handleRemoveCMCCategory = async (categoryId: string) => {
        await api.post('/overview/remove-CMC-category', { categoryId });
        await userCategoriesState.refetch();
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
            await api.post('/overview/add-custom-category', {
                name,
                token_ids: tokenIds
            });
            await customCategoriesState.refetch();
        } catch (error) {
            console.error('Error creating custom category:', error);
            throw error;
        }
    };

    const handleRemoveCustomCategory = async (categoryId: string) => {
        try {
            await api.post('/overview/remove-custom-category', { categoryId });
            await customCategoriesState.refetch();
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
                    userCategories={ userCategoriesState.data?.data || []}
                    customCategories={ customCategoriesState.data?.data || []}
                    nullStates={{
                        userCategories: userCategoriesState.isLoading,
                        customCategories: customCategoriesState.isLoading
                    }} 
                    handleRemoveCategory={handleRemoveCMCCategory}
                    handleRemoveCustomCategory={handleRemoveCustomCategory}
                    />
                </section>
                <section className="managecategories-catagory-manager">
                    <CategoryManager 
                    defaultCategories={defaultCategoriesState.data?.data || []} 
                    defaultTokens={defaultTokensState.data?.data || []}
                    nullStates={{
                        defaultCategories: defaultCategoriesState.isLoading,
                        defaultTokens: defaultTokensState.isLoading
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