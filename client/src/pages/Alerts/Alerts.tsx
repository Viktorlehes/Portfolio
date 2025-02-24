import React from "react";
import "./Alerts.css";
import ActiveAlerts from "../../components/alerts/ActiveAlerts";
import AlertCreation from "../../components/alerts/AlertCreation";
import { components } from "../../types/api-types";
import { useDataFetching, ENDPOINTS, api } from "../../utils/api";

type Alert = components["schemas"]["Alert"];
type Token = components["schemas"]["UnifiedToken"];

export interface CreateAlertData {
    id: number;
    symbol: string;
    name: string;
    upper_target_price?: number;
    lower_target_price?: number;
    percent_change_threshold?: number;
    base_price?: number;
}

const Alerts: React.FC = () => {
    const alertsState = useDataFetching<Alert[]>(ENDPOINTS.ALERTS);

    const onDeleteAlert = async (alertId: string) => {
        try {
            const response = await api.delete<Alert[]>(`/alert/${alertId}`);
            if (response.success) {
                alertsState.refetch();
            } else {

            }
        } catch (error) {
            console.error("Error deleting alert:", error);
        }
    }

    const onCreateAlert = async (alert: CreateAlertData): Promise<number | null> => {
        const alertData = {
            id: alert.id,
            symbol: alert.symbol,
            name: alert.name,
            upper_target_price: alert.upper_target_price,
            lower_target_price: alert.lower_target_price,
            percent_change_threshold: alert.percent_change_threshold,
            base_price: alert.base_price,
        }

        try {
            const response = await api.post<boolean, CreateAlertData>('/alert/', alertData);
            
            if (response.success) {
                alertsState.refetch();
                return null
            } 

            return alertsState.status
        } catch (error) {
            console.error('Error creating alert:', error);
            return 500
        }
    }

    const fetchSearchedTokens = async (name: string): Promise<Token[]> => {
        try {
            const response = await api.post<Token[], object>('/overview/find-tokens-by-name', { name });

            if (response.success) {
                return response.data!;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error searching tokens:', error);
            return [];
        }
    };

    return (
        <div className="default-page">
            <div className="overview-page-header">
                <div className="overview-main-header-content">
                    <h1>Alerts</h1>
                </div>
            </div>
            <div className="page-content">
                <div className="alerts-page-wrapper">
                    <ActiveAlerts alertState={alertsState} onDeleteAlert={onDeleteAlert}/>
                    <AlertCreation onCreateAlert={onCreateAlert} fetchAssets={fetchSearchedTokens} />
                </div>
            </div>
        </div>
    );
};

export default Alerts;