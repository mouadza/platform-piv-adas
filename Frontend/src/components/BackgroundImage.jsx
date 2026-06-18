import backgroundImage from "../assets/background.jpg";

const BackgroundImage = ({ children }) => {
  return (
    <div
      className="relative flex min-h-screen w-screen items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-slate-950/35" />
      <div className="relative z-10 flex w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default BackgroundImage;
