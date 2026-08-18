import { useCallback, useEffect, useState } from "react";
import { get, post } from "../network";

const unwrapList = (data) => (Array.isArray(data) ? data : data?.data ?? data?.content ?? []);

export function useProposal(proposalId) {
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(!!proposalId);
    const [savingDiscussion, setSavingDiscussion] = useState(false);

    const fetchProposal = useCallback(async () => {
        if (!proposalId) return;
        try {
            const { data } = await get(`/tenant/proposal/${proposalId}`);
            setProposal(data?.data ?? data ?? null);
        } catch (error) {
            console.error("Failed to fetch proposal:", error);
        }
    }, [proposalId]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            await fetchProposal();
            if (!cancelled) setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [fetchProposal]);

    const addDiscussion = useCallback(async (payload) => {
        setSavingDiscussion(true);
        try {
            await post(`/tenant/proposal/${proposalId}/discussion`, payload);
            // A discussion with termChanged creates a new version, so pull the whole proposal again.
            await fetchProposal();
            return true;
        } catch (error) {
            console.error("Failed to create proposal discussion:", error);
            return false;
        } finally {
            setSavingDiscussion(false);
        }
    }, [proposalId, fetchProposal]);

    return { proposal, setProposal, loading, savingDiscussion, addDiscussion };
}

export function useProposals(tenantId) {
    const [proposals, setProposals] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!tenantId);

    useEffect(() => {
        if (!tenantId) return;

        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const { data } = await get(`/tenant/proposal`);
                const list = unwrapList(data);
                if (!cancelled) setProposals(list);
            } catch (error) {
                console.error("Failed to fetch proposals:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [tenantId]);

    const addProposal = useCallback(async (payload) => {
        setSaving(true);
        try {
            const { data } = await post(`/tenant/proposal`, payload);
            const newProposal = data?.data ?? data;
            setProposals((prev) => [...prev, newProposal]);
            return newProposal;
        } catch (error) {
            console.error("Failed to create proposal:", error);
            return null;
        } finally {
            setSaving(false);
        }
    }, [tenantId]);

    return { proposals, loading, saving, addProposal };
}
