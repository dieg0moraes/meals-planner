"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface SetupStep {
  id: string
  label: string
  completed: boolean
  inProgress: boolean
}

interface SetupProgressProps {
  steps: SetupStep[]
}

export function SetupProgress({ steps }: SetupProgressProps) {
  const completedCount = steps.filter((s) => s.completed).length
  const totalCount = steps.length
  const progressPercentage = (completedCount / totalCount) * 100

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Profile Setup Progress</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercentage} className="h-2" />
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3 text-sm">
              {step.inProgress ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
              ) : step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={step.completed ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
