
import { useEffect, useState } from "react";

import Button from "../components/Button";
import Card from "../components/Card";
import { api, errorMessage } from "../services/api";

function VaccineInventory() {
  const [inventory, setInventory] = useState([]);
  const [vaccines, setVaccines] = useState([]);

  const [form, setForm] = useState({
    vaccineId: "",
    batchNumber: "",
    quantity: "",
    expiryDate: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // LOAD INVENTORY
  const loadInventory = async () => {
    try {
      setFetching(true);
      setError("");

      const response = await api.get(
        "/vaccine-inventory/my-clinic"
      );

      setInventory(response.data.inventory || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setFetching(false);
    }
  };

  // LOAD VACCINE CATALOGUE
  const loadVaccines = async () => {
    try {
      const response = await api.get("/vaccines");
      const data = response.data;

      const vaccineList = Array.isArray(data)
        ? data
        : data.vaccines || [];

      setVaccines(
        vaccineList.filter(
          (vaccine) => vaccine.isActive !== false
        )
      );
    } catch (err) {
      console.error("Failed to load vaccines:", err);
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    loadInventory();
    loadVaccines();
  }, []);

  // HANDLE INPUT
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // RESET FORM
  const resetForm = () => {
    setForm({
      vaccineId: "",
      batchNumber: "",
      quantity: "",
      expiryDate: "",
    });

    setEditingId(null);
    setError("");
  };

  // VALIDATION
  const validateForm = () => {
    if (!form.vaccineId) {
      return "Please select a vaccine.";
    }

    if (!form.batchNumber.trim() && !editingId) {
      return "Please enter the batch number.";
    }

    if (
      form.quantity === "" ||
      !Number.isFinite(Number(form.quantity)) ||
      Number(form.quantity) < 0 ||
      !Number.isInteger(Number(form.quantity))
    ) {
      return "Please enter a valid non-negative whole-number quantity.";
    }

    if (!form.expiryDate) {
      return "Please select the expiry date.";
    }

    const selectedDate = new Date(
      `${form.expiryDate}T00:00:00`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate <= today
    ) {
      return "Expiry date must be in the future.";
    }

    return null;
  };

  // ADD OR UPDATE INVENTORY
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        const response = await api.put(
          `/vaccine-inventory/${editingId}`,
          {
            quantity: Number(form.quantity),
            expiryDate: form.expiryDate,
          }
        );

        setMessage(
          response.data.message ||
            "Vaccine stock updated successfully."
        );
      } else {
        const response = await api.post(
          "/vaccine-inventory",
          {
            vaccineId: form.vaccineId,
            batchNumber: form.batchNumber.trim(),
            quantity: Number(form.quantity),
            expiryDate: form.expiryDate,
          }
        );

        setMessage(
          response.data.message ||
            "Vaccine batch added successfully."
        );
      }

      resetForm();
      await loadInventory();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // EDIT EXISTING BATCH
  const handleEdit = (item) => {
    setEditingId(item._id);

    setForm({
      vaccineId:
        typeof item.vaccineId === "object"
          ? item.vaccineId?._id || ""
          : item.vaccineId || "",
      batchNumber: item.batchNumber || "",
      quantity: String(item.quantity ?? ""),
      expiryDate: item.expiryDate
        ? new Date(item.expiryDate)
            .toISOString()
            .slice(0, 10)
        : "",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // DELETE INVENTORY BATCH
  const handleDelete = async (item) => {
    if (deletingId || loading) return;

    const vaccineName =
      typeof item.vaccineId === "object"
        ? item.vaccineId?.name || "this vaccine"
        : vaccines.find(
            (vaccine) => vaccine._id === item.vaccineId
          )?.name || "this vaccine";

    const confirmed = window.confirm(
      `Are you sure you want to delete the batch "${item.batchNumber}" of ${vaccineName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(item._id);
      setError("");
      setMessage("");

      await api.delete(
        `/vaccine-inventory/${item._id}`
      );

      if (editingId === item._id) {
        setForm({
          vaccineId: "",
          batchNumber: "",
          quantity: "",
          expiryDate: "",
        });

        setEditingId(null);
      }

      setMessage(
        `Batch "${item.batchNumber}" deleted successfully.`
      );

      await loadInventory();
    } catch (err) {
      console.error("Delete inventory error:", err);
      console.error("Delete response:", err.response?.data);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete vaccine batch."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // EXPIRY STATUS
  const getExpiryStatus = (item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil(
      (expiry - today) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        text: "Expired",
        className: "bg-red-50 text-red-700 border-red-200",
      };
    }

    if (item.nearExpiry || daysUntilExpiry <= 30) {
      return {
        text: "Expiring Soon",
        className:
          "bg-amber-50 text-amber-700 border-amber-200",
      };
    }

    return {
      text: "Active",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  };

  // SUMMARY VALUES
  const totalStock = inventory.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const expiringSoonCount = inventory.filter((item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil(
      (expiry - today) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }).length;

  const lowStockCount = inventory.filter(
    (item) => item.lowStock ?? item.quantity <= 10
  ).length;

  // UI
  return (
    <div className="clinic-page">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md">
                💉
              </div>

              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Vaccine Inventory
                </h1>

                <p className="text-slate-500 mt-1">
                  Manage vaccine batches and clinic stock
                </p>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-sm font-semibold text-blue-700">
                ImuniX Stock Management
              </span>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-sm text-slate-500">Total Batches</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {inventory.length}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Total Stock</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {totalStock}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">
              Low Stock Batches
            </p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {lowStockCount}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Expiring Soon</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {expiringSoonCount}
            </p>
          </Card>
        </div>

        {/* ADD / UPDATE FORM */}
        <Card
          title={
            editingId
              ? "Update Vaccine Stock"
              : "Add New Vaccine Batch"
          }
          subtitle={
            editingId
              ? "Update the quantity or expiry date of this batch."
              : "Enter the details of a new vaccine batch."
          }
          className="mb-6"
        >
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Vaccine *
                </label>

                <select
                  name="vaccineId"
                  value={form.vaccineId}
                  onChange={handleChange}
                  disabled={
                    editingId !== null || vaccines.length === 0
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-slate-100"
                >
                  <option value="">Select vaccine</option>

                  {vaccines.map((vaccine) => (
                    <option
                      key={vaccine._id}
                      value={vaccine._id}
                    >
                      {vaccine.name} ({vaccine.code})
                    </option>
                  ))}
                </select>

                {vaccines.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    No active vaccines found. Add a vaccine to the
                    catalogue first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Batch Number *
                </label>

                <input
                  type="text"
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={handleChange}
                  disabled={editingId !== null}
                  required
                  placeholder="e.g. BCG-2026-001"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Quantity *
                </label>

                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  required
                  placeholder="Enter available quantity"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Expiry Date *
                </label>

                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  min={
                    new Date(Date.now() + 86400000)
                      .toISOString()
                      .slice(0, 10)
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              {editingId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  disabled={loading || deletingId !== null}
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={
                  loading ||
                  deletingId !== null ||
                  vaccines.length === 0
                }
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Stock"
                  : "Add Vaccine Batch"}
              </Button>
            </div>
          </form>
        </Card>

        {/* INVENTORY TABLE */}
        <Card
          title="Current Vaccine Stock"
          subtitle="View and manage vaccine batches assigned to your clinic."
        >
          {fetching ? (
            <div className="py-12 text-center text-slate-500">
              Loading inventory...
            </div>
          ) : inventory.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-5xl mb-4">💉</div>

              <h3 className="text-lg font-semibold text-slate-800">
                No vaccine stock yet
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Add your first vaccine batch using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Vaccine
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Batch
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Quantity
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Expiry
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map((item) => {
                    const status = getExpiryStatus(item);

                    const vaccineName =
                      typeof item.vaccineId === "object"
                        ? item.vaccineId?.name || "Unknown vaccine"
                        : vaccines.find(
                            (vaccine) =>
                              vaccine._id === item.vaccineId
                          )?.name || "Unknown vaccine";

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-800">
                            {vaccineName}
                          </span>

                          {typeof item.vaccineId === "object" &&
                            item.vaccineId?.code && (
                              <span className="block text-xs text-slate-500 mt-1">
                                {item.vaccineId.code}
                              </span>
                            )}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {item.batchNumber}
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-bold text-slate-800">
                            {item.quantity}
                          </span>

                          {(item.lowStock ??
                            item.quantity <= 10) && (
                            <span className="block text-xs text-red-600 mt-1">
                              Low stock
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {new Date(
                            item.expiryDate
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${status.className}`}
                          >
                            {status.text}
                          </span>

                          {Number.isFinite(item.daysUntilExpiry) && (
                            <span className="block text-xs text-slate-500 mt-1">
                              {item.daysUntilExpiry < 0
                                ? `${Math.abs(item.daysUntilExpiry)} days overdue`
                                : `${item.daysUntilExpiry} days left`}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              disabled={
                                deletingId !== null || loading
                              }
                            >
                              Edit Stock
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              disabled={
                                deletingId !== null || loading
                              }
                            >
                              {deletingId === item._id
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default VaccineInventory;
