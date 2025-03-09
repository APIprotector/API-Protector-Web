import {useEffect, useState} from "react";
import { Button } from "~/components/ui/button"

export function Welcome() {
  const [hello, setHello] = useState("Waiting for hello!");

  const getHello = async () => {
    const response = await fetch("/api/hello");
    response.text().then((data)=>setHello(data));
  };

  useEffect(() => {
    getHello();
  }, []);

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <div className="w-[500px] max-w-[100vw] p-4 text-center">
            {hello}
          </div>
          <Button onClick={getHello}>Hello!</Button>
        </header>
      </div>
    </main>
  );
}
