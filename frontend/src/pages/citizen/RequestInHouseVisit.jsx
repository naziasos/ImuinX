import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api'; // Adjust path based on your project structure

const RequestInHouseVisit = () => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [formData, setFormData] = useState({
    forFamilyMember: false,
    familyMemberId: '',
    address: '',
    preferredDate: '',
    vaccineOrReason: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch linked family members on load
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        const { data } = await API.get('/api/family'); // Adjust endpoint as per your routes
        setFamilyMembers(data.familyMembers || data);
      } catch (err) {
        console.error('Error fetching family members', err);
      }
    };
    fetchFamilyMembers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await API.post('/api/in-house-requests', {
        familyMember: formData.forFamilyMember ? formData.familyMemberId : null,
        address: formData.address,
        preferredDate: formData.preferredDate,
        vaccineOrReason: formData.vaccineOrReason,
      });

      setSuccess('In-house visit requested successfully!');
      setTimeout(() => {
        navigate('/citizen/my-requests'); // Redirect to request tracking view
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Request In-House Visit</h2>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selection: Self or Family Member */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            name="forFamilyMember"
            id="forFamilyMember"
            checked={formData.forFamilyMember}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="forFamilyMember" className="text-sm font-medium text-gray-700">
            Request this visit for a family member instead of yourself
          </label>
        </div>

        {formData.forFamilyMember && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Family Member</label>
            <select
              name="familyMemberId"
              value={formData.familyMemberId}
              onChange={handleChange}
              required={formData.forFamilyMember}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Choose Family Member --</option>
              {familyMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.relation})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visit Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            rows="3"
            placeholder="Enter full street address, house/apartment number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        {/* Preferred Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date & Time</label>
          <input
            type="datetime-local"
            name="preferredDate"
            value={formData.preferredDate}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Vaccine or Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine Name / Reason for Visit</label>
          <input
            type="text"
            name="vaccineOrReason"
            value={formData.vaccineOrReason}
            onChange={handleChange}
            required
            placeholder="e.g., Covid-19 Booster or General Health Check"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 font-medium"
        >
          {loading ? 'Submitting...' : 'Submit In-House Request'}
        </button>
      </form>
    </div>
  );
};

export default RequestInHouseVisit;