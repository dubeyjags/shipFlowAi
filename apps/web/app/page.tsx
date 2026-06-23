"use client";
import { createUserSchema } from "@monorepo/utils";
import axios from "axios";
import { useState } from "react";
import type { SubmitEvent } from "react";

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState("");
  const [success, setSuccess] = useState(false);
  const handleSubmt = async (e: SubmitEvent<HTMLFormElement>) => {
    setSuccess(false);
    setErrors("");
    e.preventDefault();
    const result = createUserSchema.safeParse(formData);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      setErrors(message);
      return alert(message);
    }
    console.log(result.data);
    try {
      const res = await axios.post("http://localhost:5000/users", result.data);
      console.log(res);
      setSuccess(true);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <form onSubmit={handleSubmt} noValidate>
      {errors && errors.split(", ").map((error, i) => <p key={i}>{error}</p>)}
      {success && <p>Success</p>}
      <input
        type="text"
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <input
        type="email"
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <input
        type="password"
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
