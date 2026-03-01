import { useNavigation } from "react-router";

/**
 * This component is a loading bouncer that shows a brutalist spinner when the
 * page is loading.  Put it on the page and it will automatically show a spinner
 * when navigation state is not idle.
 *
 * @returns A loading bouncer component.
 *
 * @see https://frontend-hero.com/neubrutalism-css-spinner-examples
 */
export default function PageLoadingBouncer() {
  const nav = useNavigation();
  if (nav.state === "idle") return null;

  return (
    <div className="fixed top-10 right-10 z-50">
      <div className="pointer-events-auto fixed top-0 left-0 z-40 h-full w-full bg-white opacity-20" />
      <div
        style={{
          width: "80px",
          height: "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#FFD93D",
            border: "3px solid #000",
            boxShadow: "3px 3px 0 #000",
            animation: "brutalist-spin-16 1s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#6BCB77",
            border: "3px solid #000",
            boxShadow: "3px 3px 0 #000",
            animation: "brutalist-spin-16 1s ease-in-out 0.2s infinite",
          }}
        />
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#4D96FF",
            border: "3px solid #000",
            boxShadow: "3px 3px 0 #000",
            animation: "brutalist-spin-16 1s ease-in-out 0.4s infinite",
          }}
        />
      </div>
    </div>
  );
}
