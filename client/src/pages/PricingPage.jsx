                onChoose={handleChoose}
              />
            ))}
          </div>

          {audience === "schools" && (
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
              Need more teacher accounts or a school-specific arrangement?{" "}
              <Link
                to="/contact"
                className="font-semibold text-brand underline-offset-4 hover:underline"
              >
                Talk to us
              </Link>
              .
            </p>
          )}

          {/* Teacher comparison */}
          {audience === "teachers" && (
            <div className="mt-14">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowCompare((value) => !value)}
                  aria-expanded={showCompare}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {showCompare ? "Hide" : "Compare"} all teacher features
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showCompare ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
              {showCompare && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                  <CompareTable />
                </div>
              )}
            </div>
          )}

          {/* Trust strip */}
          <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Secure payments",
                text: "Payments are processed through Paystack.",
              },
              {
                icon: WifiOff,
                title: "Offline quiz support",
                text: "Available on eligible paid plans; answers sync when students reconnect.",
              },
              {
                icon: BadgeCheck,
                title: "Free to start",
                text: "Keep using the Free plan for as long as you like.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
              Questions, answered
            </h2>
            <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {faqs.map(([question, answer]) => (
                <details
                  key={question}
                  className="group px-5 py-4 sm:px-6 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 pr-8 text-sm leading-6 text-muted-foreground">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* Closing CTA */}
          <div className="mx-auto mt-20 max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand/80 p-8 text-center shadow-2xl shadow-brand/20 sm:p-12">
            <h2 className="font-display text-3xl font-bold tracking-tight text-brand-foreground sm:text-4xl">
              Ready to run your first quiz?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-foreground/80">
              Create a free account, generate questions with AI and share the
              codes with your students.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-brand-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <MessageCircle className="h-4 w-4" /> Talk to us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
