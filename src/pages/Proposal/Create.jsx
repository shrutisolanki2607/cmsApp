import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuPlus } from "react-icons/lu";
import Button from "../../common/Button/Button";
import Modal from "../../Modal";
import { useAuth } from "../../context/AuthContext";
import { useProposals } from "../../hooks/useProposals";
import { useClients } from "../../hooks/useClients";
import { useClientUsers } from "../../hooks/useClientUsers";

const BILLING_OPTIONS = ["MONTHLY", "HALF_YEARLY", "YEARLY", "ONE_TIME"];

const FORM = {
    title: "",
    description: "",
    clientId: "",
    clientUserId: "",
    proposalStartDate: "",
    proposalAmount: "",
    billing: BILLING_OPTIONS[0],
    startDate: "",
    endDate: "",
};

const MEMBER_FORM = {
    firstname: "",
    lastname: "",
    mobile: "",
    email: "",
    active: true,
};

export default function CreateProposal() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const tenantId = user?.tenantId;
    const { saving, addProposal } = useProposals(tenantId);
    const { clients } = useClients(tenantId);

    const [form, setForm] = useState(FORM);
    const { clientUsers, saving: savingMember, addClientUser } = useClientUsers(form.clientId || null);

    const [memberModal, setMemberModal] = useState(false);
    const [memberForm, setMemberForm] = useState(MEMBER_FORM);

    const handleFieldChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleClientChange = (e) => {
        setForm((prev) => ({ ...prev, clientId: e.target.value, clientUserId: "" }));
    };

    const handleMemberFieldChange = (field) => (e) => {
        const value = field === "active" ? e.target.checked : e.target.value;
        setMemberForm((prev) => ({ ...prev, [field]: value }));
    };

    const closeMemberModal = () => {
        setMemberModal(false);
        setMemberForm(MEMBER_FORM);
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        const created = await addClientUser(memberForm);
        if (created) {
            setForm((prev) => ({ ...prev, clientUserId: String(created.id) }));
            closeMemberModal();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const created = await addProposal({
            title: form.title,
            description: form.description,
            clientId: Number(form.clientId),
            clientUserId: Number(form.clientUserId),
            proposalStartDate: form.proposalStartDate
                ? new Date(form.proposalStartDate).toISOString()
                : null,
            proposalAmount: Number(form.proposalAmount),
            billing: form.billing,
            startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
            endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
            createdBy: user?.id,
            createdAt: new Date().toISOString(),
        });
        if (created) navigate(`/proposal/${created.id}`, { state: { proposal: created } });
    };

    return (
        <div>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    aria-label="Back"
                    onClick={() => navigate("/proposal")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-primary hover:bg-primary-light"
                >
                    <LuArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="text-xl font-semibold text-text-primary">Create Proposal</h1>
            </div>

            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-border bg-surface p-8">
                <h2 className="text-center text-2xl font-bold text-text-primary">Create Proposal</h2>
                <p className="mt-1 text-center text-sm text-text-secondary">
                    Enter your proposal details below to create the proposal.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Proposal Title*
                        </label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={handleFieldChange("title")}
                            placeholder="Enter proposal title"
                            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Client*
                        </label>
                        <select
                            required
                            value={form.clientId}
                            onChange={handleClientChange}
                            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                        >
                            <option value="" disabled>
                                Select a client
                            </option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Client User*
                            </label>
                            <button
                                type="button"
                                disabled={!form.clientId}
                                onClick={() => setMemberModal(true)}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <LuPlus className="h-3 w-3" />
                                Add Member
                            </button>
                        </div>
                        <select
                            required
                            disabled={!form.clientId}
                            value={form.clientUserId}
                            onChange={handleFieldChange("clientUserId")}
                            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value="" disabled>
                                {form.clientId ? "Select a client user" : "Select a client first"}
                            </option>
                            {clientUsers.map((clientUser) => (
                                <option key={clientUser.id} value={clientUser.id}>
                                    {[clientUser.firstname, clientUser.lastname].filter(Boolean).join(" ") ||
                                        clientUser.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Proposal Start Date*
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={form.proposalStartDate}
                            onChange={handleFieldChange("proposalStartDate")}
                            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Proposal Amount*
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={form.proposalAmount}
                                onChange={handleFieldChange("proposalAmount")}
                                placeholder="Enter amount"
                                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Billing*
                            </label>
                            <select
                                required
                                value={form.billing}
                                onChange={handleFieldChange("billing")}
                                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                            >
                                {BILLING_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option.replaceAll("_", " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Start Date*
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={form.startDate}
                                onChange={handleFieldChange("startDate")}
                                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                End Date*
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={form.endDate}
                                onChange={handleFieldChange("endDate")}
                                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={handleFieldChange("description")}
                            rows={4}
                            placeholder="Enter description"
                            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-primary"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate("/proposal")}
                            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-primary-light"
                        >
                            Cancel
                        </button>
                        <Button type="submit" className="!w-auto px-6" loading={saving}>
                            Create Proposal
                        </Button>
                    </div>
                </form>
            </div>

            {memberModal && (
                <Modal title="Add Client Member" onClose={closeMemberModal} width={480}>
                    <form onSubmit={handleAddMember} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-text-primary">First Name</label>
                            <input
                                type="text"
                                required
                                value={memberForm.firstname}
                                onChange={handleMemberFieldChange("firstname")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-text-primary">Last Name</label>
                            <input
                                type="text"
                                required
                                value={memberForm.lastname}
                                onChange={handleMemberFieldChange("lastname")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="mb-1 block text-sm font-medium text-text-primary">Email</label>
                            <input
                                type="email"
                                required
                                value={memberForm.email}
                                onChange={handleMemberFieldChange("email")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="mb-1 block text-sm font-medium text-text-primary">Mobile</label>
                            <input
                                type="tel"
                                required
                                value={memberForm.mobile}
                                onChange={handleMemberFieldChange("mobile")}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                            />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                            <input
                                id="member-active"
                                type="checkbox"
                                checked={memberForm.active}
                                onChange={handleMemberFieldChange("active")}
                                className="h-4 w-4 rounded border-border"
                            />
                            <label htmlFor="member-active" className="text-sm font-medium text-text-primary">
                                Active
                            </label>
                        </div>

                        <div className="col-span-2 mt-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeMemberModal}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-primary-light"
                            >
                                Cancel
                            </button>
                            <Button type="submit" className="!w-auto px-4" loading={savingMember}>
                                Add
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
