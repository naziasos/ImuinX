import { useState } from "react";

function CreateAdmin() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    setupKey: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Creating admin...");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/create-admin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not connect to server");
    }
  };

  return (
    <div>
      <h1>ImuinX - Create Admin</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Admin Name"
          value={formData.name}
          onChange={handleChange}
        />

        <br />
        <br />

        <input
          type="email"
          name="email"
          placeholder="Admin Email"
          value={formData.email}
          onChange={handleChange}
        />

        <br />
        <br />

        <input
          type="password"
          name="password"
          placeholder="Admin Password"
          value={formData.password}
          onChange={handleChange}
        />

        <br />
        <br />

        <input
          type="text"
          name="setupKey"
          placeholder="Admin Setup Key"
          value={formData.setupKey}
          onChange={handleChange}
        />

        <br />
        <br />

        <button type="submit">Create Admin</button>
      </form>

      <p>{message}</p>
    </div>
  );
}

export default CreateAdmin;