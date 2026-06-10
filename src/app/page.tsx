import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <Image
        src="/images/bcc/logos/bcc-stacked-white-official.svg"
        alt="BCC Academy"
        width={180}
        height={180}
        priority
      />
    </div>
  );
}
