import { useState, useEffect, useCallback } from "react";
import supabase from "./supabase";
import { exportToCSV } from "./utils";

const STORAGE_KEY = "srt_report_tracker_2026";

export default function App() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  // LOAD (cloud → fallback local)
  useEffect(() => {
    (async () => {
      try {
        const { data: cloud } = await supabase
          .from("srt_data")
          .select("*")
          .eq("key", STORAGE_KEY)
          .single();

        if (cloud?.value) {
          setData(JSON.parse(cloud.value));
        } else {
          const local = localStorage.getItem(STORAGE_KEY);
          if (local) setData(JSON.parse(local));
        }
      } catch {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) setData(JSON.parse(local));
      }
      setLoading(false);
    })();
  }, []);

  // SAVE (cloud + local)
  const save = useCallback(async (newData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));

    await supabase.from("srt_data").upsert({
      key: STORAGE_KEY,
      value: JSON.stringify(newData),
    });
  }, []);

  const addDummy = () => {
    const newData = {
      ...data,
      test: { hello: Math.random() }
    };
    setData(newData);
    save(newData);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Sun Report Tool ☀️</h1>

      <button onClick={addDummy}>
        Add Test Data
      </button>

      <button onClick={() => exportToCSV(data)}>
        Export to Excel
      </button>

      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}