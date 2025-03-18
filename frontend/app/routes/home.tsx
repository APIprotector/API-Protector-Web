import type { Route } from "./+types/home";
import {useEffect, useState} from "react";
import { Button } from "~/components/ui/button"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "API Protector" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const [hello, setHello] = useState("Waiting for hello!");

  const getHello = async () => {
    const response = await fetch("/api/v1/hello");
    response.text().then((data)=>setHello(data));
  };

  useEffect(() => {
    getHello();
  }, []);

  return (
      <h1 className="text-3xl font-bold mb-6"><Button onClick={getHello}>{hello}</Button></h1>
  );
}