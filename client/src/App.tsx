// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PaymentComponent from "./components/PaymentForm"; 
import Success from "./components/Success"; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaymentComponent />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;