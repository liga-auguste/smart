from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from cards.models import Card, Stapel


DEMO_CARDS = [
    # (stapel, order, content)
    ("books", 0, "Slow productivity\nDo fewer things\nWork at a natural pace\nObsess over quality"),
    ("books", 1, "Progress is just discomfort you decided to sit with."),
    ("misc", 0, "80% signal and 20% noise"),
    ("misc", 1, "Done is better than perfect."),
    ("questions", 0, "Before you complain:\nDid you sleep enough?\nDid you drink water?\nDid you move your body?\nTry that first."),
    ("questions", 1, "Three questions worth asking weekly:\nWhat drained me?\nWhat energized me?\nWhat do I want more of?"),
    ("stoic", 0, "You cannot control what happens. Only how you respond."),
    ("stoic", 1, "Memento mori. You will die. Act accordingly."),
    ("stoic", 2, "The obstacle is the way."),
    ("", 0, "You don't serve people from your cup, you serve them from the overflow of the cup."),
    ("", 1, "A little bit of truth exists in everything; but the whole truth in nothing."),
]

DEMO_STAPEL = [
    ("books", 0),
    ("misc", 1),
    ("questions", 2),
    ("stoic", 3),
]


class Command(BaseCommand):
    help = "Reset the demo account with fresh demo data"

    def handle(self, *args, **options):
        demo = User.objects.get(username="demo")

        Card.objects.filter(user=demo).delete()
        Stapel.objects.filter(user=demo).delete()

        for name, order in DEMO_STAPEL:
            Stapel.objects.create(user=demo, name=name, order=order)

        for stapel, order, content in DEMO_CARDS:
            Card.objects.create(user=demo, stapel=stapel, order=order, content=content)

        self.stdout.write("Demo data created successfully.")
