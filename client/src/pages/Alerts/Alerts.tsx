import React, { useEffect } from "react";
import "./Alerts.css";
import ActiveAlerts from "../../components/alerts/ActiveAlerts";
import AlertCreation from "../../components/alerts/AlertCreation";
import { components } from "../../types/api-types";
import { useDataFetching, ENDPOINTS, api } from "../../utils/api";

type Alert = components["schemas"]["Alert"];
type Token = components["schemas"]["FullCMCToken"];

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
    const alertsState = useDataFetching<Alert[]>(ENDPOINTS.ALERTS, "viktor.lehes@gmail.com");
    const [error, setError] = React.useState<Number | null>(Number(alertsState.error?.message.split(":")[1]) || null);
    
    const onDeleteAlert = async (alertId: string) => {
        try {
            const response = await api.post("/alerts/delete-alert", { alert_id: alertId } );
            if (!response.detail) {
                alertsState.refetch();
            }
        } catch (error) {
            console.error("Error deleting alert:", error);
        }
    }

    const onCreateAlert = async (alert: CreateAlertData) => {
        const alertData = {
            id: alert.id,
            symbol: alert.symbol,
            name: alert.name,
            upper_target_price: alert.upper_target_price,
            lower_target_price: alert.lower_target_price,
            percent_change_threshold: alert.percent_change_threshold,
            base_price: alert.base_price,
            email: "viktor.lehes@gmail.com"
        }

        try {
            const response = await api.post('/alerts/create-alert', alertData);
            
            if (!response.detail) {
                alertsState.refetch();
            }
        } catch (error) {
            console.error('Error creating alert:', error);
        }


    }

    const fetchSearchedTokens = async (name: string): Promise<Token[]> => {
        try {
            const response = await api.post('/overview/find-tokens-by-name', { name });

            return response;
        } catch (error) {
            console.error('Error searching tokens:', error);
            return [];
        }
    };

    useEffect(() => {
        if (alertsState.error) {
            setError(Number(alertsState.error?.message.split(":")[1]));
        }
    }, [alertsState.error]);

    return (
        <div className="default-page">
            <div className="overview-page-header">
                <div className="overview-main-header-content">
                    <h1>Alerts</h1>
                </div>
            </div>
            <div className="page-content">
                <div className="alerts-page-wrapper">
                    <ActiveAlerts alerts={alertsState.data || []} isNull={alertsState.isLoading} onDeleteAlert={onDeleteAlert} error={error}
                     />
                    <AlertCreation onCreateAlert={onCreateAlert} fetchAssets={fetchSearchedTokens} />
                </div>
            </div>
        </div>
    );
};

export default Alerts;