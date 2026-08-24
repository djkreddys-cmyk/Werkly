"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { JobSummary } from "@/lib/jobs";
import { JobShareButton } from "@/components/job-share-button";

function formatDate(value?: string) {
  if (!value) {
    return "Open";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PublicJobsTable({ jobs }: { jobs: JobSummary[] }) {
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");

  const sectorOptions = useMemo(
    () =>
      Array.from(new Set(jobs.map((job) => job.sector).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [jobs]
  );

  const locationOptions = useMemo(
    () =>
      Array.from(new Set(jobs.map((job) => job.location).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [jobs]
  );

  const employmentTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(jobs.map((job) => job.employmentType).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesQuery =
        !query ||
        [job.title, job.jobCode, job.clientName, job.location, job.sector, job.experience]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query.trim().toLowerCase()));

      const matchesSector = sectorFilter === "all" || job.sector === sectorFilter;
      const matchesLocation = locationFilter === "all" || job.location === locationFilter;
      const matchesType =
        employmentTypeFilter === "all" || job.employmentType === employmentTypeFilter;

      return matchesQuery && matchesSector && matchesLocation && matchesType;
    });
  }, [employmentTypeFilter, jobs, locationFilter, query, sectorFilter]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[0_10px_28px_rgba(15,47,54,0.05)] sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.4fr)_220px_220px_220px] xl:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Search Jobs
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, job ID, client, location"
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Sector
            </span>
            <select
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All sectors</option>
              {sectorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Location
            </span>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All locations</option>
              {locationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Employment Type
            </span>
            <select
              value={employmentTypeFilter}
              onChange={(event) => setEmploymentTypeFilter(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All types</option>
              {employmentTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-muted)]">
            Showing <span className="font-semibold text-[var(--color-ink)]">{filteredJobs.length}</span>{" "}
            active jobs
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSectorFilter("all");
              setLocationFilter("all");
              setEmploymentTypeFilter("all");
            }}
            className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:hidden">
        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-line)] bg-white px-5 py-10 text-center text-sm text-[var(--color-muted)]">
            No jobs matched the current filters.
          </div>
        ) : (
          filteredJobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[0_10px_28px_rgba(15,47,54,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
                    Job {job.jobCode || "Pending"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold leading-snug text-[var(--color-ink)]">{job.title}</h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{job.sector}</p>
                </div>
                <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--color-dark)]">
                  {job.status}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-[var(--color-line)] py-4 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-[0.1em] text-slate-400">Location</dt>
                  <dd className="mt-1 font-semibold text-[var(--color-ink)]">{job.location}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.1em] text-slate-400">Experience</dt>
                  <dd className="mt-1 font-semibold text-[var(--color-ink)]">{job.experience}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.1em] text-slate-400">Type</dt>
                  <dd className="mt-1 font-semibold text-[var(--color-ink)]">{job.employmentType}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.1em] text-slate-400">Apply by</dt>
                  <dd className="mt-1 font-semibold text-[var(--color-ink)]">{formatDate(job.lastDateToApply)}</dd>
                </div>
              </dl>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link href={`/jobs/${job.slug}`} className="inline-flex items-center justify-center rounded-xl bg-[var(--color-dark)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-accent-strong)]">
                  View details
                </Link>
                <JobShareButton
                  title={job.title}
                  slug={job.slug}
                  jobCode={job.jobCode}
                  sector={job.sector}
                  location={job.location}
                  experience={job.experience}
                  employmentType={job.employmentType}
                  positionsCount={job.positionsCount}
                  lastDateToApply={job.lastDateToApply}
                  salary={job.salary}
                  packagePerAnnum={job.packagePerAnnum}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-dark)] px-4 py-3 text-sm font-bold text-[var(--color-dark)]"
                />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[0_10px_28px_rgba(15,47,54,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead>
              <tr className="bg-[#eef5f5] text-left">
                {[
                  "Job ID",
                  "Position",
                  "Sector",
                  "Location",
                  "Openings",
                  "Experience",
                  "Type",
                  "Apply By",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)] ${
                      heading === "Action"
                        ? "w-[250px] min-w-[250px] text-center"
                        : ""
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-[var(--color-muted)]"
                  >
                    No jobs matched the current filters.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, index) => (
                  <tr
                    key={job.id}
                    className={
                      index === filteredJobs.length - 1
                        ? "align-middle"
                        : "align-middle border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                      {job.jobCode || "Pending"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{job.title}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{job.sector}</td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{job.location}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {job.positionsCount ?? 1}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{job.experience}</td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {job.employmentType}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDate(job.lastDateToApply)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                        {job.status}
                      </span>
                    </td>
                    <td className="w-[250px] min-w-[250px] px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/jobs/${job.slug}`}
                          className="inline-flex min-w-[108px] items-center justify-center whitespace-nowrap rounded-2xl bg-[var(--color-dark)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                        >
                          View Details
                        </Link>
                        <JobShareButton
                          title={job.title}
                          slug={job.slug}
                          jobCode={job.jobCode}
                          sector={job.sector}
                          location={job.location}
                          experience={job.experience}
                          employmentType={job.employmentType}
                          positionsCount={job.positionsCount}
                          lastDateToApply={job.lastDateToApply}
                          salary={job.salary}
                          packagePerAnnum={job.packagePerAnnum}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
