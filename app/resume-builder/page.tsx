"use client";

import { useEffect } from "react";

export default function ResumeBuilderRedirectPage() {
  useEffect(() => {
    window.location.replace("/#resume-builder");
  }, []);

  return null;
}
