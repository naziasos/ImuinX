
import { useEffect, useState } from "react";


import Button from "../components/Button";
import Card from "../components/Card";
import { api, errorMessage } from "../services/api";

function VaccineInventory({ onBack }) {

  const [inventory, setInventory] = useState([]);

  const [form, setForm] = useState({
    vaccineType: "",
    batchNumber: "",
    quantity: "",
    expiryDate: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================
  // LOAD INVENTORY
  // ==========================================

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

  useEffect(() => {
    loadInventory();
  }, []);

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // RESET FORM
  // ==========================================

  const resetForm = () => {
    setForm({
      vaccineType: "",
      batchNumber: "",
      quantity: "",
      expiryDate: "",
    });

    setEditingId(null);
    setError("");
    
  };

  // ==========================================
  // VALIDATION
  // ==========================================

  const validateForm = () => {
    if (!form.vaccineType.trim()) {
      return "Please select a vaccine type.";
    }

    if (!form.batchNumber.trim()) {
      return "Please enter the batch number.";
    }

    if (
      form.quantity === "" ||
      Number(form.quantity) < 0
    ) {
      return "Please enter a valid quantity.";
    }

    if (!form.expiryDate) {
      return "Please select the expiry date.";
    }

    const selectedDate = new Date(form.expiryDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return "Expiry date cannot be in the past.";
    }

    return null;
  };

  // ==========================================
  // SUBMIT FORM
  // ==========================================

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
        // UPDATE EXISTING STOCK

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
        // ADD NEW BATCH

        const response = await api.post(
          "/vaccine-inventory",
          {
            vaccineType: form.vaccineType.trim(),
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

  // ==========================================
  // EDIT EXISTING BATCH
  // ==========================================

  const handleEdit = (item) => {
    setEditingId(item._id);

    setForm({
      vaccineType: item.vaccineType,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      expiryDate: item.expiryDate
        ? item.expiryDate.slice(0, 10)
        : "",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // EXPIRY STATUS
  // ==========================================

  const getExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);

    const difference =
      (expiry - today) /
      (1000 * 60 * 60 * 24);

    if (difference < 0) {
      return {
        text: "Expired",
        className:
          "bg-red-50 text-red-700 border-red-200",
      };
    }

    if (difference <= 30) {
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

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button
  type="button"
  onClick={onBack}
  className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
>
  ← Back to Dashboard
</button>
       

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
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
            </div>

            <div className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-sm font-semibold text-blue-700">
                ImuniX Stock Management
              </span>
            </div>

          </div>
        </div>

        {/* Alerts */}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

          <Card>
            <p className="text-sm text-slate-500">
              Total Batches
            </p>

            <p className="text-3xl font-bold text-slate-900 mt-2">
              {inventory.length}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">
              Total Stock
            </p>

            <p className="text-3xl font-bold text-blue-600 mt-2">
              {inventory.reduce(
                (total, item) =>
                  total + Number(item.quantity || 0),
                0
              )}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">
              Expiring Soon
            </p>

            <p className="text-3xl font-bold text-amber-600 mt-2">
              {
                inventory.filter((item) => {
                  const days =
                    (new Date(item.expiryDate) -
                      new Date()) /
                    (1000 * 60 * 60 * 24);

                  return days >= 0 && days <= 30;
                }).length
              }
            </p>
          </Card>

        </div>

        {/* Add / Update Form */}
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

              {/* Vaccine Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Vaccine Type *
                </label>

                <select
                  name="vaccineType"
                  value={form.vaccineType}
                  onChange={handleChange}
                  disabled={editingId !== null}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-slate-100"
                >
                  <option value="">
                    Select vaccine type
                  </option>

                  <option value="BCG">BCG</option>
                  <option value="OPV">OPV</option>
                  <option value="Pentavalent">
                    Pentavalent
                  </option>
                  <option value="PCV">PCV</option>
                  <option value="MR">MR</option>
                  <option value="COVID-19">
                    COVID-19
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Batch Number */}
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
                  placeholder="e.g. BCG-2026-001"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              {/* Quantity */}
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
                  placeholder="Enter available quantity"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Expiry Date *
                </label>

                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">

              {editingId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
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

        {/* Inventory Table */}
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

              <div className="text-5xl mb-4">
                💉
              </div>

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

                    const status = getExpiryStatus(
                      item.expiryDate
                    );

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >

                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-800">
                            {item.vaccineType}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {item.batchNumber}
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-bold text-slate-800">
                            {item.quantity}
                          </span>
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

                        </td>

                        <td className="px-4 py-4 text-right">

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleEdit(item)
                            }
                          >
                            Edit Stock
                          </Button>

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

