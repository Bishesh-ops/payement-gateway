// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PaymentComponent from "./components/PaymentForm";
import Success from "./components/Success";
import Failure from "./components/Failure";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaymentComponent />} />
        <Route path="/success" element={<Success />} />
        <Route path="/failure" element={<Failure />} />
        {/* <Route path="/payment-failure" element={<Failure />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
