import React, { useEffect, useState } from "react";

function ShowWork() {
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDuties = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5000/api/clinics/my-duty",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load duties");
        }

        setDuties(data.duties || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDuties();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <div>Loading duties...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>My Work</h1>

      {duties.length === 0 ? (
        <p>No duty assigned</p>
      ) : (
        <div>
          {duties.map((duty) => (
            <div key={duty._id}>
              <p>
                <strong>Duty Date:</strong>{" "}
                {formatDate(duty.dutyDate)}
              </p>

              <p>
                <strong>Duty Type:</strong>{" "}
                {duty.dutyType}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ShowWork;