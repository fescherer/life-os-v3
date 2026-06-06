import FinancialIntro from "./components/FinancialIntro";

function FinancialFeature() {
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold leading-tight">Financial</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your first real Life OS feature starts here.
        </p>
      </div>

      <FinancialIntro />
    </section>
  );
}

export default FinancialFeature;
