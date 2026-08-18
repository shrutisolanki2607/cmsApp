import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { LuArrowLeft, LuPlus, LuMessageSquare, LuFolder } from "react-icons/lu";
import Button from "../../common/Button/Button";
import Modal from "../../Modal";
import { put } from "../../network";
import { useAuth } from "../../context/AuthContext";
import { useProposal } from "../../hooks/useProposals";
import { useClientUsers } from "../../hooks/useClientUsers";

const BILLING_OPTIONS = ["MONTHLY", "HALF_YEARLY", "YEARLY", "ONE_TIME"];

const DISCUSSION_FORM = {
    title: "",
    description: "",
    remarks: "",
    requirement: "",
    meetingDate: "",
    clientUserId: "",
    termChanged: false,
    proposalAmount: "",
    billing: "",
    startDate: "",
    endDate: "",
};

function toDateTimeLocal(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function ProposalBuilder() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { proposal: fetchedProposal, setProposal, loading, savingDiscussion, addDiscussion } = useProposal(id);
    const proposal = fetchedProposal ?? location.state?.proposal ?? null;

    const { user } = useAuth();
    const { clientUsers } = useClientUsers(proposal?.client?.id ?? null);
    const client = proposal?.client ?? null;
    const clientUser = proposal?.clientUser ?? null;

    const discussions = proposal?.discussions ?? [];
    const versions = proposal?.versions ?? [];
    const latestVersion = versions[0];

    const [updating, setUpdating] = useState(false);
    const [discussionModal, setDiscussionModal] = useState(false);
    const [discussionForm, setDiscussionForm] = useState(DISCUSSION_FORM);

    const openDiscussionModal = () => {
        setDiscussionForm({
            ...DISCUSSION_FORM,
            clientUserId: proposal?.clientUser?.id ? String(proposal.clientUser.id) : "",
            proposalAmount: latestVersion?.proposalAmount ?? "",
            billing: latestVersion?.billing ?? "",
            startDate: toDateTimeLocal(latestVersion?.startDate),
            endDate: toDateTimeLocal(latestVersion?.endDate),
        });
        setDiscussionModal(true);
    };

    const handleDiscussionFieldChange = (field) => (e) => {
        const value = field === "termChanged" ? e.target.checked : e.target.value;
        setDiscussionForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddDiscussion = async (e) => {
        e.preventDefault();

        const payload = {
            proposalId: proposal.id,
            clientUserId: Number(discussionForm.clientUserId),
            tenantUserId: user?.id,
            meetingDate: discussionForm.meetingDate
                ? new Date(discussionForm.meetingDate).toISOString()
                : null,
            title: discussionForm.title,
            description: discussionForm.description,
            remarks: discussionForm.remarks,
            requirement: discussionForm.requirement,
            termChanged: discussionForm.termChanged,
            createdBy: user?.id,
        };

        if (proposal.proposalStartDate) {
            payload.proposalStartDate = new Date(proposal.proposalStartDate).toISOString();
        }

        if (discussionForm.termChanged) {
            payload.proposalAmount = Number(discussionForm.proposalAmount);
            payload.billing = discussionForm.billing;
            payload.startDate = new Date(discussionForm.startDate).toISOString();
            payload.endDate = new Date(discussionForm.endDate).toISOString();
        }

        const success = await addDiscussion(payload);
        if (success) setDiscussionModal(false);
    };

    const handleStatusChange = async (status) => {
        if (!proposal) return;
        if (status === "DECLINE" && !window.confirm("Cancel this proposal?")) return;
        setUpdating(true);
        try {
            const { data } = await put(`/tenant/proposal/${proposal.id}`, { ...proposal, status });
            const updated = data?.data ?? data ?? { ...proposal, status };
            setProposal(updated);
        } catch (error) {
            console.error("Failed to update proposal status:", error);
        } finally {
            setUpdating(false);
        }
    };

    if (!proposal) {
        return (
            <div>
                <button
                    type="button"
                    onClick={() => navigate("/proposal")}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                >
                    <LuArrowLeft className="h-4 w-4" />
                    Back to proposals
                </button>
                <p className="mt-6 text-sm text-text-secondary">
                    {loading ? "Loading proposal..." : "Proposal not found."}
                </p>
            </div>
        );
    }

    const isTerminal = proposal.status === "COMPLETE" || proposal.status === "DECLINE";

    return (
        <div>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Back"
                        onClick={() => navigate("/proposal")}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-primary hover:bg-primary-light"
                    >
                        <LuArrowLeft className="h-4 w-4" />
                    </button>
                    <h1 className="text-xl font-semibold text-text-primary">{proposal.title}</h1>
                </div>

                {!isTerminal && (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleStatusChange("DECLINE")}
                            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel Proposal
                        </button>
                        <Button
                            type="button"
                            className="!w-auto px-4"
                            loading={updating}
                            onClick={() => handleStatusChange("COMPLETE")}
                        >
                            Submit Proposal
                        </Button>
                    </div>
                )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <div className="rounded-xl border border-border bg-surface p-6">
                    <h2 className="text-sm font-semibold text-text-primary">Discussions</h2>

                    <div className="mt-4 space-y-3">
                        {discussions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-text-secondary">
                                <LuFolder className="h-8 w-8" />
                                <p className="text-sm">No discussions yet</p>
                            </div>
                        ) : (
                            discussions.map((d) => {
                                const withClientUser = clientUsers.find((u) => u.id === d.clientUserId);
                                return (
                                    <div key={d.id} className="rounded-xl border border-border p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-text">
                                                    <LuMessageSquare className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-text-primary">{d.title}</p>
                                                    {d.description && (
                                                        <p className="mt-1 text-sm text-text-secondary">{d.description}</p>
                                                    )}
                                                    {withClientUser && (
                                                        <p className="mt-1 text-xs text-text-secondary">
                                                            With{" "}
                                                            {[withClientUser.firstname, withClientUser.lastname]
                                                                .filter(Boolean)
                                                                .join(" ") || withClientUser.email}
                                                        </p>
                                                    )}
                                                    {(d.remarks || d.requirement) && (
                                                        <div className="mt-2 space-y-1 text-xs text-text-secondary">
                                                            {d.remarks && <p>Remarks: {d.remarks}</p>}
                                                            {d.requirement && <p>Requirement: {d.requirement}</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="whitespace-nowrap text-xs text-text-secondary">
                                                {formatDateTime(d.meetingDate)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-6 flex justify-center">
                        <button
                            type="button"
                            onClick={openDiscussionModal}
                            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                        >
                            <LuPlus className="h-4 w-4" />
                            Add Discussion
                        </button>
                    </div>
                </div>

                <div className="h-fit rounded-xl border border-border bg-surface p-5">
                    <h2 className="text-sm font-semibold text-text-primary">Details</h2>
                    <div className="mt-4 space-y-4 text-sm">
                        <div>
                            <p className="text-xs text-text-secondary">Status</p>
                            <p className="mt-0.5 font-medium text-text-primary">{proposal.status}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary">Client</p>
                            <p className="mt-0.5 font-medium text-text-primary">{client?.name || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary">Client User</p>
                            <p className="mt-0.5 font-medium text-text-primary">
                                {clientUser
                                    ? [clientUser.firstname, clientUser.lastname].filter(Boolean).join(" ") ||
                                      clientUser.email
                                    : "-"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary">Proposal Start Date</p>
                            <p className="mt-0.5 font-medium text-text-primary">
                                {formatDateTime(proposal.proposalStartDate)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary">Description</p>
                            <p className="mt-0.5 font-medium text-text-primary">{proposal.description || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary">Created</p>
                            <p className="mt-0.5 font-medium text-text-primary">{proposal.createdAt || "-"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {discussionModal && (
                <Modal title="Add Discussion" onClose={() => setDiscussionModal(false)} width={520}>
                    <form onSubmit={handleAddDiscussion} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="mb-1 block text-sm font-medium text-text-primary">Title</label>
                            <input
                                type="text"
                                required
                                value={discussionForm.title}
                                onChange={handleDiscussionFieldChange("title")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-text-primary">Meeting Date</label>
                            <input
                                type="datetime-local"
                                required
                                value={discussionForm.meetingDate}
                                onChange={handleDiscussionFieldChange("meetingDate")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-text-primary">Client User</label>
                            <select
                                required
                                value={discussionForm.clientUserId}
                                onChange={handleDiscussionFieldChange("clientUserId")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            >
                                <option value="" disabled>
                                    Select a client user
                                </option>
                                {clientUsers.map((clientUserOption) => (
                                    <option key={clientUserOption.id} value={clientUserOption.id}>
                                        {[clientUserOption.firstname, clientUserOption.lastname]
                                            .filter(Boolean)
                                            .join(" ") || clientUserOption.email}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="mb-1 block text-sm font-medium text-text-primary">Description</label>
                            <textarea
                                rows={3}
                                value={discussionForm.description}
                                onChange={handleDiscussionFieldChange("description")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-text-primary">Remarks</label>
                            <input
                                type="text"
                                value={discussionForm.remarks}
                                onChange={handleDiscussionFieldChange("remarks")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-text-primary">Requirement</label>
                            <input
                                type="text"
                                value={discussionForm.requirement}
                                onChange={handleDiscussionFieldChange("requirement")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                            <input
                                id="term-changed"
                                type="checkbox"
                                checked={discussionForm.termChanged}
                                onChange={handleDiscussionFieldChange("termChanged")}
                                className="h-4 w-4 rounded border-border"
                            />
                            <label htmlFor="term-changed" className="text-sm font-medium text-text-primary">
                                Terms changed
                            </label>
                        </div>

                        {discussionForm.termChanged && (
                            <>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-text-primary">Proposal Amount</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={discussionForm.proposalAmount}
                                        onChange={handleDiscussionFieldChange("proposalAmount")}
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-text-primary">Billing</label>
                                    <select
                                        required
                                        value={discussionForm.billing}
                                        onChange={handleDiscussionFieldChange("billing")}
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                                    >
                                        <option value="" disabled>
                                            Select billing
                                        </option>
                                        {BILLING_OPTIONS.map((value) => (
                                            <option key={value} value={value}>
                                                {value.replaceAll("_", " ")}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-text-primary">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={discussionForm.startDate}
                                        onChange={handleDiscussionFieldChange("startDate")}
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-text-primary">End Date</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={discussionForm.endDate}
                                        onChange={handleDiscussionFieldChange("endDate")}
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                                    />
                                </div>
                            </>
                        )}

                        <div className="col-span-2 mt-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDiscussionModal(false)}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-primary-light"
                            >
                                Cancel
                            </button>
                            <Button type="submit" className="!w-auto px-4" loading={savingDiscussion}>
                                Add
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
